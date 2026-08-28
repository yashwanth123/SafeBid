import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { badRequest, forbidden, notFound } from "../../lib/errors";
import { applyWalletChange, ensureWallet, lockWallet } from "../../lib/wallet";
import { getStripe, requireStripe } from "../../lib/stripe";
import { notify } from "../../lib/notify";
import { validate } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";
import type { Request } from "express";

export const paymentsRouter = Router();

paymentsRouter.post(
  "/bookings/:id/intent",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { payment: true, service: true, provider: true },
    });
    if (!booking) throw notFound("Booking not found");
    if (booking.customerId !== req.user!.id) throw forbidden();
    if (!booking.payment) throw badRequest("Payment record missing");
    if (booking.payment.status === "ESCROWED") {
      return res.json({ status: "ESCROWED", clientSecret: null });
    }

    if (env.MOCK_PAYMENTS || !getStripe()) {
      await escrowPayment(booking.id, booking.providerId, booking.priceCents, "mock_pi_" + booking.id, "card");
      await notify({
        userId: booking.providerId,
        type: "PAYMENT",
        title: "Payment in escrow",
        body: "The customer paid. Confirm the job to start.",
        data: { bookingId: booking.id },
      });
      return res.json({ status: "ESCROWED", mock: true, clientSecret: null });
    }

    const stripe = requireStripe();
    const customer = await prisma.user.findUnique({ where: { id: req.user!.id } });
    let stripeCustomerId = customer?.stripeCustomerId;
    if (!stripeCustomerId) {
      const sc = await stripe.customers.create({
        email: customer?.email,
        name: customer?.name,
      });
      stripeCustomerId = sc.id;
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { stripeCustomerId },
      });
    }

    const intent = await stripe.paymentIntents.create({
      amount: booking.priceCents,
      currency: "usd",
      customer: stripeCustomerId,
      capture_method: "automatic",
      automatic_payment_methods: { enabled: true },
      metadata: { bookingId: booking.id, providerId: booking.providerId },
      transfer_group: booking.id,
    });

    await prisma.payment.update({
      where: { id: booking.payment.id },
      data: { stripePaymentIntentId: intent.id },
    });

    res.json({ status: "PENDING", clientSecret: intent.client_secret, mock: false });
  }),
);

export const stripeWebhookHandler = asyncHandler(async (req: Request, res) => {
    const stripe = getStripe();
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      return res.status(200).json({ received: true, ignored: true });
    }
    const sig = req.headers["stripe-signature"];
    if (typeof sig !== "string") return res.status(400).send("Missing signature");
    const event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      const bookingId = intent.metadata?.bookingId;
      if (bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (booking) {
          await escrowPayment(
            booking.id,
            booking.providerId,
            booking.priceCents,
            intent.id,
            intent.payment_method_types?.[0],
          );
          await notify({
            userId: booking.providerId,
            type: "PAYMENT",
            title: "Payment in escrow",
            body: "The customer paid. Confirm the job to start.",
            data: { bookingId: booking.id },
          });
        }
      }
    }

    if (event.type === "identity.verification_session.verified") {
      const session = event.data.object as { id: string; metadata?: { userId?: string } };
      const userId = session.metadata?.userId;
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { verificationStatus: "VERIFIED" },
        });
        await notify({
          userId,
          type: "IDENTITY",
          title: "ID verified",
          body: "Your government ID was verified. You can now offer services.",
        });
      }
    }

    if (event.type === "identity.verification_session.requires_input") {
      const session = event.data.object as { id: string; metadata?: { userId?: string } };
      const userId = session.metadata?.userId;
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { verificationStatus: "REJECTED" },
        });
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object as {
        id: string;
        payouts_enabled?: boolean;
        charges_enabled?: boolean;
      };
      await prisma.user.updateMany({
        where: { stripeAccountId: account.id },
        data: { stripeAccountReady: Boolean(account.payouts_enabled && account.charges_enabled) },
      });
    }

    res.json({ received: true });
});

paymentsRouter.get(
  "/wallet",
  requireAuth,
  asyncHandler(async (req, res) => {
    const wallet = await ensureWallet(req.user!.id);
    const entries = await prisma.ledgerEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({ wallet, entries, withdrawals });
  }),
);

paymentsRouter.post(
  "/connect/onboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (env.MOCK_PAYMENTS || !getStripe()) {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { stripeAccountId: "acct_mock_" + req.user!.id, stripeAccountReady: true },
      });
      return res.json({ url: null, mock: true, ready: true });
    }
    const stripe = requireStripe();
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    let accountId = user?.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user?.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { userId: req.user!.id },
      });
      accountId = account.id;
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { stripeAccountId: accountId },
      });
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${env.FRONTEND_URL}/wallet?connect=refresh`,
      return_url: `${env.FRONTEND_URL}/wallet?connect=done`,
      type: "account_onboarding",
    });
    res.json({ url: link.url, mock: false });
  }),
);

paymentsRouter.post(
  "/withdraw",
  requireAuth,
  validate(z.object({ amountCents: z.number().int().min(100) })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw notFound();
    if (!env.MOCK_PAYMENTS && !user.stripeAccountReady) {
      throw forbidden("Connect a payout account first");
    }

    const withdrawal = await prisma.$transaction(async (tx) => {
      const wallet = await lockWallet(req.user!.id, tx);
      if (wallet.availableBalanceCents < req.body.amountCents) {
        throw badRequest("Insufficient available balance");
      }
      await applyWalletChange(tx, {
        userId: req.user!.id,
        availableDelta: -req.body.amountCents,
        pendingDelta: 0,
        type: "WITHDRAWAL",
        amountCents: -req.body.amountCents,
        description: "Provider withdrawal",
      });
      const created = await tx.withdrawal.create({
        data: {
          userId: req.user!.id,
          walletId: wallet.id,
          amountCents: req.body.amountCents,
          status: env.MOCK_PAYMENTS || !getStripe() ? "COMPLETED" : "PROCESSING",
        },
      });
      const stripe = getStripe();
      if (stripe && user.stripeAccountId && !env.MOCK_PAYMENTS) {
        const payout = await stripe.payouts.create(
          { amount: req.body.amountCents, currency: "usd" },
          { stripeAccount: user.stripeAccountId },
        );
        await tx.withdrawal.update({
          where: { id: created.id },
          data: { stripePayoutId: payout.id },
        });
      }
      return created;
    });

    res.status(201).json({ withdrawal });
  }),
);

export async function escrowPayment(
  bookingId: string,
  providerId: string,
  amountCents: number,
  stripeRef: string,
  method?: string,
) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { bookingId } });
    if (!payment || payment.status === "ESCROWED") return;
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "ESCROWED",
        stripePaymentIntentId: stripeRef,
        method: method ?? "card",
      },
    });
    await applyWalletChange(tx, {
      userId: providerId,
      availableDelta: 0,
      pendingDelta: amountCents,
      type: "ESCROW_HOLD",
      amountCents,
      bookingId,
      stripeRef,
      description: "Customer payment held in escrow",
    });
  });
}

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { badRequest, forbidden, notFound } from "../../lib/errors";
import { env } from "../../config/env";
import { notify } from "../../lib/notify";
import { toPublicUser } from "../../lib/serializers";
import { assertBookingParticipant, transitionBooking } from "../../lib/bookingState";
import { applyWalletChange, creditPlatform } from "../../lib/wallet";
import { getStripe } from "../../lib/stripe";
import { validate } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";

export const bookingsRouter = Router();

const createSchema = z.object({
  serviceId: z.string().min(1),
  scheduledAt: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

bookingsRouter.post(
  "/",
  requireAuth,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const service = await prisma.service.findUnique({
      where: { id: req.body.serviceId },
      include: { provider: true },
    });
    if (!service || !service.isActive) throw notFound("Service not found");
    if (service.providerId === req.user!.id) throw badRequest("You cannot book your own service");
    if (service.provider.verificationStatus !== "VERIFIED") {
      throw forbidden("This provider is not ID-verified");
    }

    const scheduledAt = new Date(req.body.scheduledAt);
    if (scheduledAt.getTime() < Date.now() - 60_000) {
      throw badRequest("Scheduled time must be in the future");
    }

    const commissionCents = Math.round((service.priceCents * env.PLATFORM_COMMISSION_BPS) / 10_000);
    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          serviceId: service.id,
          customerId: req.user!.id,
          providerId: service.providerId,
          scheduledAt,
          priceCents: service.priceCents,
          commissionCents,
          notes: req.body.notes,
          status: "CREATED",
        },
      });
      await tx.payment.create({
        data: {
          bookingId: created.id,
          status: "PENDING",
          amountCents: service.priceCents,
          commissionCents,
        },
      });
      await tx.bookingStatusEvent.create({
        data: { bookingId: created.id, to: "CREATED", actorId: req.user!.id },
      });
      return created;
    });

    await notify({
      userId: service.providerId,
      type: "BOOKING",
      title: "New booking request",
      body: `${req.user!.email} requested ${service.title}`,
      data: { bookingId: booking.id },
    });

    res.status(201).json({ booking: await loadBooking(booking.id) });
  }),
);

bookingsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const role = (req.query.role as string) === "provider" ? "provider" : "customer";
    const bookings = await prisma.booking.findMany({
      where: role === "provider" ? { providerId: req.user!.id } : { customerId: req.user!.id },
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json({ bookings: bookings.map(shapeBooking) });
  }),
);

bookingsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: bookingInclude,
    });
    if (!booking) throw notFound("Booking not found");
    if (req.user!.role !== "ADMIN") assertBookingParticipant(booking, req.user!.id);
    res.json({ booking: shapeBooking(booking) });
  }),
);

bookingsRouter.post(
  "/:id/confirm",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { payment: true },
    });
    if (!booking) throw notFound("Booking not found");
    assertBookingParticipant(booking, req.user!.id, "provider");
    if (!booking.payment || booking.payment.status !== "ESCROWED") {
      throw badRequest("Payment must be in escrow before confirming");
    }
    await transitionBooking({ bookingId: booking.id, to: "CONFIRMED", actorId: req.user!.id });
    await notify({
      userId: booking.customerId,
      type: "BOOKING",
      title: "Booking confirmed",
      body: "Your provider confirmed the job. Funds remain in escrow until completion.",
      data: { bookingId: booking.id },
    });
    res.json({ booking: await loadBooking(booking.id) });
  }),
);

bookingsRouter.post(
  "/:id/start",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) throw notFound("Booking not found");
    assertBookingParticipant(booking, req.user!.id, "provider");
    await transitionBooking({ bookingId: booking.id, to: "IN_PROGRESS", actorId: req.user!.id });
    await notify({
      userId: booking.customerId,
      type: "BOOKING",
      title: "Job in progress",
      body: "Your provider started the job.",
      data: { bookingId: booking.id },
    });
    res.json({ booking: await loadBooking(booking.id) });
  }),
);

bookingsRouter.post(
  "/:id/complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) throw notFound("Booking not found");
    assertBookingParticipant(booking, req.user!.id, "provider");
    await transitionBooking({ bookingId: booking.id, to: "COMPLETED", actorId: req.user!.id });
    await notify({
      userId: booking.customerId,
      type: "BOOKING",
      title: "Job completed",
      body: "Please review the work to release escrowed funds.",
      data: { bookingId: booking.id },
    });
    res.json({ booking: await loadBooking(booking.id) });
  }),
);

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
});

bookingsRouter.post(
  "/:id/review",
  requireAuth,
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { payment: true, review: true },
    });
    if (!booking) throw notFound("Booking not found");
    assertBookingParticipant(booking, req.user!.id, "customer");
    if (booking.status !== "COMPLETED") throw badRequest("Job must be completed before review");
    if (booking.review) throw badRequest("Already reviewed");

    await prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          bookingId: booking.id,
          authorId: req.user!.id,
          subjectId: booking.providerId,
          rating: req.body.rating,
          body: req.body.body,
        },
      });
      const agg = await tx.review.aggregate({
        where: { subjectId: booking.providerId },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await tx.user.update({
        where: { id: booking.providerId },
        data: {
          ratingAvg: agg._avg.rating ?? 0,
          ratingCount: agg._count.rating,
        },
      });
      await transitionBooking({
        bookingId: booking.id,
        to: "REVIEWED",
        actorId: req.user!.id,
        tx,
      });

      if (booking.payment && booking.payment.status === "ESCROWED") {
        const net = booking.priceCents - booking.commissionCents;
        await applyWalletChange(tx, {
          userId: booking.providerId,
          availableDelta: net,
          pendingDelta: -booking.priceCents,
          type: "RELEASE",
          amountCents: net,
          bookingId: booking.id,
          description: "Escrow released after customer review",
        });
        await applyWalletChange(tx, {
          userId: booking.providerId,
          availableDelta: 0,
          pendingDelta: 0,
          type: "COMMISSION",
          amountCents: -booking.commissionCents,
          bookingId: booking.id,
          description: "5% platform commission",
        });
        await creditPlatform(tx, {
          amountCents: booking.commissionCents,
          type: "COMMISSION",
          bookingId: booking.id,
          description: `Commission on booking ${booking.id}`,
        });
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: "RELEASED" },
        });

        const stripe = getStripe();
        const provider = await tx.user.findUnique({ where: { id: booking.providerId } });
        if (stripe && provider?.stripeAccountId && provider.stripeAccountReady) {
          const transfer = await stripe.transfers.create({
            amount: net,
            currency: "usd",
            destination: provider.stripeAccountId,
            transfer_group: booking.id,
          });
          await tx.payment.update({
            where: { id: booking.payment.id },
            data: { stripeTransferId: transfer.id },
          });
        }
      }
    });

    await notify({
      userId: booking.providerId,
      type: "PAYMENT",
      title: "Funds released",
      body: "The customer reviewed the job. Escrow has been released to your wallet.",
      data: { bookingId: booking.id },
    });

    res.json({ booking: await loadBooking(booking.id) });
  }),
);

bookingsRouter.post(
  "/:id/cancel",
  requireAuth,
  validate(z.object({ reason: z.string().max(500).optional() })),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { payment: true },
    });
    if (!booking) throw notFound("Booking not found");
    if (req.user!.role !== "ADMIN") assertBookingParticipant(booking, req.user!.id);
    if (booking.status === "REVIEWED") throw badRequest("Completed jobs cannot be cancelled");

    await prisma.$transaction(async (tx) => {
      await transitionBooking({
        bookingId: booking.id,
        to: "CANCELLED",
        actorId: req.user!.id,
        note: req.body.reason,
        tx,
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { cancelReason: req.body.reason },
      });
      if (booking.payment && booking.payment.status === "ESCROWED") {
        await applyWalletChange(tx, {
          userId: booking.providerId,
          availableDelta: 0,
          pendingDelta: -booking.priceCents,
          type: "REFUND",
          amountCents: -booking.priceCents,
          bookingId: booking.id,
          description: "Escrow reversed on cancellation",
        });
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: "REFUNDED" },
        });
        const stripe = getStripe();
        if (stripe && booking.payment.stripePaymentIntentId) {
          await stripe.refunds.create({ payment_intent: booking.payment.stripePaymentIntentId });
        }
      } else if (booking.payment && booking.payment.status === "PENDING") {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: "FAILED" },
        });
      }
    });

    const other = req.user!.id === booking.customerId ? booking.providerId : booking.customerId;
    await notify({
      userId: other,
      type: "BOOKING",
      title: "Booking cancelled",
      body: req.body.reason || "The booking was cancelled.",
      data: { bookingId: booking.id },
    });
    res.json({ booking: await loadBooking(booking.id) });
  }),
);

const bookingInclude = {
  service: true,
  customer: true,
  provider: true,
  payment: true,
  review: true,
  statusEvents: { orderBy: { createdAt: "asc" as const } },
};

async function loadBooking(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
  if (!booking) throw notFound("Booking not found");
  return shapeBooking(booking);
}

function shapeBooking(b: Awaited<ReturnType<typeof prisma.booking.findFirstOrThrow>> & {
  service: { id: string; title: string; priceCents: number; category: string };
  customer: Parameters<typeof toPublicUser>[0];
  provider: Parameters<typeof toPublicUser>[0];
  payment: { id: string; status: string; amountCents: number; commissionCents: number } | null;
  review: { id: string; rating: number; body: string | null } | null;
  statusEvents: { id: string; from: string | null; to: string; createdAt: Date; note: string | null }[];
}) {
  return {
    id: b.id,
    status: b.status,
    scheduledAt: b.scheduledAt,
    priceCents: b.priceCents,
    commissionCents: b.commissionCents,
    notes: b.notes,
    cancelReason: b.cancelReason,
    createdAt: b.createdAt,
    service: b.service,
    customer: toPublicUser(b.customer),
    provider: toPublicUser(b.provider),
    payment: b.payment,
    review: b.review,
    statusEvents: b.statusEvents,
  };
}

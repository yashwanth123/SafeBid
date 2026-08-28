import { Router } from "express";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { getStripe } from "../../lib/stripe";
import { notify } from "../../lib/notify";
import { requireAuth } from "../../middleware/auth";

export const identityRouter = Router();

identityRouter.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { verificationStatus: true, stripeIdentitySessionId: true },
    });
    res.json(user);
  }),
);

identityRouter.post(
  "/session",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "Not found" });
    if (user.verificationStatus === "VERIFIED") {
      return res.json({ status: "VERIFIED", mock: env.MOCK_IDENTITY });
    }

    if (env.MOCK_IDENTITY || !getStripe()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationStatus: "PENDING", stripeIdentitySessionId: "vs_mock_" + user.id },
      });
      return res.json({
        status: "PENDING",
        mock: true,
        clientSecret: null,
        url: "/verify?mock=1",
      });
    }

    const stripe = getStripe()!;
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { userId: user.id },
      options: {
        document: {
          require_matching_selfie: true,
          require_live_capture: true,
          allowed_types: ["driving_license", "passport", "id_card"],
        },
      },
      return_url: env.STRIPE_IDENTITY_RETURN_URL || `${env.FRONTEND_URL}/verify/return`,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationStatus: "PENDING",
        stripeIdentitySessionId: session.id,
      },
    });

    res.json({
      status: "PENDING",
      mock: false,
      clientSecret: session.client_secret,
      url: session.url,
    });
  }),
);

identityRouter.post(
  "/mock/complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!env.MOCK_IDENTITY) {
      return res.status(400).json({ error: "Mock identity is disabled" });
    }
    const outcome = (req.body?.outcome as string) === "rejected" ? "REJECTED" : "VERIFIED";
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { verificationStatus: outcome },
    });
    if (outcome === "VERIFIED") {
      await notify({
        userId: user.id,
        type: "IDENTITY",
        title: "ID verified",
        body: "Your government ID was verified. You can now offer services.",
      });
    }
    res.json({ status: user.verificationStatus });
  }),
);

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { badRequest, notFound } from "../../lib/errors";
import { assertBookingParticipant } from "../../lib/bookingState";
import { notify } from "../../lib/notify";
import { validate } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";

export const disputesRouter = Router();

disputesRouter.post(
  "/",
  requireAuth,
  validate(
    z.object({
      bookingId: z.string().min(1),
      reason: z.string().min(5).max(200),
      details: z.string().max(2000).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({ where: { id: req.body.bookingId } });
    if (!booking) throw notFound("Booking not found");
    assertBookingParticipant(booking, req.user!.id);
    if (!["IN_PROGRESS", "COMPLETED", "CONFIRMED"].includes(booking.status)) {
      throw badRequest("This booking cannot be disputed in its current state");
    }
    const existing = await prisma.dispute.findUnique({ where: { bookingId: booking.id } });
    if (existing) throw badRequest("A dispute already exists for this booking");

    const dispute = await prisma.dispute.create({
      data: {
        bookingId: booking.id,
        openerId: req.user!.id,
        reason: req.body.reason,
        details: req.body.details,
      },
    });
    const other = req.user!.id === booking.customerId ? booking.providerId : booking.customerId;
    await notify({
      userId: other,
      type: "MODERATION",
      title: "Dispute opened",
      body: req.body.reason,
      data: { disputeId: dispute.id, bookingId: booking.id },
    });
    res.status(201).json({ dispute });
  }),
);

disputesRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: { booking: true },
    });
    if (!dispute) throw notFound("Dispute not found");
    if (req.user!.role !== "ADMIN") assertBookingParticipant(dispute.booking, req.user!.id);
    res.json({ dispute });
  }),
);

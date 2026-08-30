import { Router } from "express";
import { z } from "zod";
import { JobRequestStatus, ServiceCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors";
import { boundingBox, haversineKm } from "../../lib/geo";
import { assertFairPrice, getRate, listRates } from "../../lib/rateCard";
import { env } from "../../config/env";
import { notify } from "../../lib/notify";
import { toPublicUser } from "../../lib/serializers";
import { validate } from "../../middleware/errorHandler";
import { optionalAuth, requireAuth, requireVerified } from "../../middleware/auth";

export const jobsRouter = Router();

jobsRouter.get("/rates", (_req, res) => {
  res.json({
    rates: listRates(),
    commissionBps: env.PLATFORM_COMMISSION_BPS,
    rule: "The posted price is the contract. Providers take the job or skip it. No comment bids.",
  });
});

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  priceCents: z.number().int(),
  category: z.nativeEnum(ServiceCategory),
  scheduledAt: z.string().datetime(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().max(200).optional(),
});

jobsRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const category = req.query.category as ServiceCategory | undefined;
    const status = (req.query.status as JobRequestStatus | undefined) ?? "OPEN";
    const mine = req.query.mine === "1" || req.query.mine === "true";
    const me = req.user ? await prisma.user.findUnique({ where: { id: req.user.id } }) : null;
    const lat = req.query.lat ? Number(req.query.lat) : me?.latitude;
    const lng = req.query.lng ? Number(req.query.lng) : me?.longitude;
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : me?.radiusKm ?? 8;

    const where: Record<string, unknown> = {};
    if (mine) {
      if (!req.user) throw forbidden("Sign in to see your jobs");
      where.customerId = req.user.id;
    } else if (Object.values(JobRequestStatus).includes(status)) {
      where.status = status;
    }
    if (category && Object.values(ServiceCategory).includes(category)) where.category = category;
    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      const box = boundingBox(lat, lng, radiusKm);
      where.latitude = { gte: box.minLat, lte: box.maxLat };
      where.longitude = { gte: box.minLng, lte: box.maxLng };
    }

    const jobs = await prisma.jobRequest.findMany({
      where,
      include: { customer: true, claimedBy: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const mapped = jobs
      .map((job) => ({
        ...serializeJob(job),
        distanceKm:
          lat != null && lng != null && job.latitude != null && job.longitude != null
            ? haversineKm(lat, lng, job.latitude, job.longitude)
            : null,
      }))
      .filter((job) => job.distanceKm == null || job.distanceKm <= radiusKm);

    res.json({ jobs: mapped });
  }),
);

jobsRouter.post(
  "/",
  requireAuth,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    assertFairPrice(req.body.category, req.body.priceCents);
    const scheduledAt = new Date(req.body.scheduledAt);
    if (scheduledAt.getTime() < Date.now() - 60_000) {
      throw badRequest("Scheduled time must be in the future");
    }
    const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const rate = getRate(req.body.category);
    const job = await prisma.jobRequest.create({
      data: {
        customerId: req.user!.id,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        priceCents: req.body.priceCents,
        suggestedCents: rate.suggestedCents,
        scheduledAt,
        latitude: req.body.latitude ?? me?.latitude,
        longitude: req.body.longitude ?? me?.longitude,
        address: req.body.address ?? me?.address,
      },
      include: { customer: true, claimedBy: true },
    });
    res.status(201).json({ job: serializeJob(job) });
  }),
);

jobsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.jobRequest.findUnique({
      where: { id: req.params.id },
      include: { customer: true, claimedBy: true, booking: true },
    });
    if (!job) throw notFound("Job not found");
    res.json({ job: serializeJob(job) });
  }),
);

jobsRouter.post(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.jobRequest.findUnique({ where: { id: req.params.id } });
    if (!job) throw notFound("Job not found");
    if (job.customerId !== req.user!.id && req.user!.role !== "ADMIN") throw forbidden();
    if (job.status !== "OPEN") throw badRequest("Only open jobs can be cancelled");
    const updated = await prisma.jobRequest.update({
      where: { id: job.id },
      data: { status: "CANCELLED" },
      include: { customer: true, claimedBy: true },
    });
    res.json({ job: serializeJob(updated) });
  }),
);

jobsRouter.post(
  "/:id/claim",
  requireAuth,
  requireVerified,
  asyncHandler(async (req, res) => {
    const claimed = await prisma.$transaction(async (tx) => {
      const job = await tx.jobRequest.findUnique({ where: { id: req.params.id } });
      if (!job) throw notFound("Job not found");
      if (job.customerId === req.user!.id) throw badRequest("You cannot take your own job");
      if (job.status !== "OPEN") throw conflict("Someone already took this job");

      const locked = await tx.jobRequest.updateMany({
        where: { id: job.id, status: "OPEN" },
        data: { status: "CLAIMED", claimedById: req.user!.id },
      });
      if (locked.count !== 1) throw conflict("Someone already took this job");

      const commissionCents = Math.round((job.priceCents * env.PLATFORM_COMMISSION_BPS) / 10_000);
      const service = await tx.service.create({
        data: {
          providerId: req.user!.id,
          title: job.title,
          description: job.description,
          priceCents: job.priceCents,
          category: job.category,
          isActive: false,
          latitude: job.latitude,
          longitude: job.longitude,
          address: job.address,
          availability: { oneOff: true, jobRequestId: job.id },
        },
      });
      const booking = await tx.booking.create({
        data: {
          serviceId: service.id,
          customerId: job.customerId,
          providerId: req.user!.id,
          scheduledAt: job.scheduledAt,
          priceCents: job.priceCents,
          commissionCents,
          notes: "Claimed from a posted job at the listed price.",
          status: "CREATED",
        },
      });
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          status: "PENDING",
          amountCents: job.priceCents,
          commissionCents,
        },
      });
      await tx.bookingStatusEvent.create({
        data: { bookingId: booking.id, to: "CREATED", actorId: req.user!.id },
      });
      const updated = await tx.jobRequest.update({
        where: { id: job.id },
        data: { bookingId: booking.id },
        include: { customer: true, claimedBy: true, booking: true },
      });
      return { job: updated, bookingId: booking.id };
    });

    const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
    await notify({
      userId: claimed.job.customerId,
      type: "BOOKING",
      title: "A neighbor took your job",
      body: `${me?.name ?? "A verified provider"} accepted ${claimed.job.title} at the posted price. Pay into escrow to make it happen.`,
      data: { bookingId: claimed.bookingId, jobId: claimed.job.id },
    });

    if (me && me.role === "USER") {
      await prisma.user.update({ where: { id: me.id }, data: { role: "PROVIDER" } });
    }

    res.status(201).json({ job: serializeJob(claimed.job), bookingId: claimed.bookingId });
  }),
);

function serializeJob(job: {
  id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  priceCents: number;
  suggestedCents: number;
  scheduledAt: Date;
  status: JobRequestStatus;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  createdAt: Date;
  bookingId: string | null;
  customer: Parameters<typeof toPublicUser>[0];
  claimedBy: Parameters<typeof toPublicUser>[0] | null;
}) {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    category: job.category,
    priceCents: job.priceCents,
    suggestedCents: job.suggestedCents,
    scheduledAt: job.scheduledAt,
    status: job.status,
    latitude: job.latitude,
    longitude: job.longitude,
    address: job.address,
    createdAt: job.createdAt,
    bookingId: job.bookingId,
    customer: toPublicUser(job.customer),
    claimedBy: job.claimedBy ? toPublicUser(job.claimedBy) : null,
  };
}

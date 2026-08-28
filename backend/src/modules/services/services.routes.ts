import { Router } from "express";
import { z } from "zod";
import { ServiceCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { forbidden, notFound } from "../../lib/errors";
import { boundingBox, haversineKm } from "../../lib/geo";
import { toPublicUser } from "../../lib/serializers";
import { validate } from "../../middleware/errorHandler";
import { optionalAuth, requireAuth, requireVerified } from "../../middleware/auth";

export const servicesRouter = Router();

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  priceCents: z.number().int().min(100).max(10_000_000),
  category: z.nativeEnum(ServiceCategory),
  availability: z.record(z.unknown()).optional(),
  images: z.array(z.string()).max(8).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().max(200).optional(),
});

servicesRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const category = req.query.category as ServiceCategory | undefined;
    const q = (req.query.q as string | undefined)?.trim();
    const me = req.user ? await prisma.user.findUnique({ where: { id: req.user.id } }) : null;
    const lat = req.query.lat ? Number(req.query.lat) : me?.latitude;
    const lng = req.query.lng ? Number(req.query.lng) : me?.longitude;
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : me?.radiusKm ?? 8;

    const where: Record<string, unknown> = { isActive: true };
    if (category && Object.values(ServiceCategory).includes(category)) where.category = category;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }
    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      const box = boundingBox(lat, lng, radiusKm);
      where.latitude = { gte: box.minLat, lte: box.maxLat };
      where.longitude = { gte: box.minLng, lte: box.maxLng };
    }

    const services = await prisma.service.findMany({
      where,
      include: { provider: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const mapped = services
      .map((s) => ({
        ...serializeService(s),
        distanceKm:
          lat != null && lng != null && s.latitude != null && s.longitude != null
            ? haversineKm(lat, lng, s.latitude, s.longitude)
            : null,
      }))
      .filter((s) => s.distanceKm == null || s.distanceKm <= radiusKm);

    res.json({ services: mapped });
  }),
);

servicesRouter.post(
  "/",
  requireAuth,
  requireVerified,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const service = await prisma.service.create({
      data: {
        providerId: req.user!.id,
        title: req.body.title,
        description: req.body.description,
        priceCents: req.body.priceCents,
        category: req.body.category,
        availability: req.body.availability,
        images: req.body.images ?? [],
        latitude: req.body.latitude ?? me?.latitude,
        longitude: req.body.longitude ?? me?.longitude,
        address: req.body.address ?? me?.address,
      },
      include: { provider: true },
    });
    if (me && me.role === "USER") {
      await prisma.user.update({ where: { id: me.id }, data: { role: "PROVIDER" } });
    }
    res.status(201).json({ service: serializeService(service) });
  }),
);

servicesRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: { provider: true },
    });
    if (!service) throw notFound("Service not found");
    const reviews = await prisma.review.findMany({
      where: { subjectId: service.providerId },
      include: { author: true },
      take: 12,
      orderBy: { createdAt: "desc" },
    });
    res.json({
      service: serializeService(service),
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        createdAt: r.createdAt,
        author: toPublicUser(r.author),
      })),
    });
  }),
);

servicesRouter.patch(
  "/:id",
  requireAuth,
  validate(createSchema.partial()),
  asyncHandler(async (req, res) => {
    const service = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!service) throw notFound("Service not found");
    if (service.providerId !== req.user!.id && req.user!.role !== "ADMIN") throw forbidden();
    const updated = await prisma.service.update({
      where: { id: service.id },
      data: req.body,
      include: { provider: true },
    });
    res.json({ service: serializeService(updated) });
  }),
);

servicesRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const service = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!service) throw notFound("Service not found");
    if (service.providerId !== req.user!.id && req.user!.role !== "ADMIN") throw forbidden();
    await prisma.service.update({ where: { id: service.id }, data: { isActive: false } });
    res.json({ ok: true });
  }),
);

function serializeService(s: {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  category: ServiceCategory;
  availability: unknown;
  images: string[];
  isActive: boolean;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  createdAt: Date;
  provider: Parameters<typeof toPublicUser>[0];
}) {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    priceCents: s.priceCents,
    category: s.category,
    availability: s.availability,
    images: s.images,
    isActive: s.isActive,
    latitude: s.latitude,
    longitude: s.longitude,
    address: s.address,
    createdAt: s.createdAt,
    provider: toPublicUser(s.provider),
  };
}

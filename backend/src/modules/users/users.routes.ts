import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { notFound } from "../../lib/errors";
import { toMe, toPublicUser } from "../../lib/serializers";
import { validate } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";

export const usersRouter = Router();

usersRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw notFound("User not found");
    res.json({ user: toMe(user) });
  }),
);

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().max(30).optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().min(1).max(50).optional(),
  expoPushToken: z.string().max(200).optional(),
});

usersRouter.patch(
  "/me",
  requireAuth,
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
    });
    res.json({ user: toMe(user) });
  }),
);

usersRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw notFound("User not found");
    const services = await prisma.service.findMany({
      where: { providerId: user.id, isActive: true },
      take: 12,
      orderBy: { createdAt: "desc" },
    });
    const reviews = await prisma.review.findMany({
      where: { subjectId: user.id },
      include: { author: true },
      take: 10,
      orderBy: { createdAt: "desc" },
    });
    res.json({
      user: toPublicUser(user),
      services,
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

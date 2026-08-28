import { Router } from "express";
import { z } from "zod";
import { PostCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { forbidden, notFound } from "../../lib/errors";
import { boundingBox, haversineKm } from "../../lib/geo";
import { toPublicUser } from "../../lib/serializers";
import { emitFeed } from "../../realtime/socket";
import { validate } from "../../middleware/errorHandler";
import { optionalAuth, requireAuth } from "../../middleware/auth";

export const postsRouter = Router();

const createSchema = z.object({
  content: z.string().min(1).max(4000),
  category: z.nativeEnum(PostCategory).default("GENERAL"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().max(200).optional(),
  images: z.array(z.string()).max(6).optional(),
});

postsRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const category = req.query.category as PostCategory | undefined;
    const cursor = req.query.cursor as string | undefined;
    const take = Math.min(Number(req.query.limit) || 20, 50);

    const me = req.user
      ? await prisma.user.findUnique({ where: { id: req.user.id } })
      : null;
    const lat = req.query.lat ? Number(req.query.lat) : me?.latitude;
    const lng = req.query.lng ? Number(req.query.lng) : me?.longitude;
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : me?.radiusKm ?? 8;

    const where: Record<string, unknown> = {};
    if (category && Object.values(PostCategory).includes(category)) {
      where.category = category;
    }

    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      const box = boundingBox(lat, lng, radiusKm);
      where.AND = [
        { OR: [{ latitude: null }, { latitude: { gte: box.minLat, lte: box.maxLat } }] },
        { OR: [{ longitude: null }, { longitude: { gte: box.minLng, lte: box.maxLng } }] },
      ];
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        author: true,
        _count: { select: { likes: true, comments: true } },
        likes: req.user ? { where: { userId: req.user.id }, select: { id: true } } : false,
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const sliced = posts.slice(0, take);
    const nextCursor = posts.length > take ? sliced[sliced.length - 1].id : null;

    const withDistance = sliced
      .map((post) => {
        const distanceKm =
          lat != null && lng != null && post.latitude != null && post.longitude != null
            ? haversineKm(lat, lng, post.latitude, post.longitude)
            : null;
        return {
          id: post.id,
          content: post.content,
          category: post.category,
          latitude: post.latitude,
          longitude: post.longitude,
          address: post.address,
          images: post.images,
          shareCount: post.shareCount,
          createdAt: post.createdAt,
          author: toPublicUser(post.author),
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          liked: Array.isArray(post.likes) ? post.likes.length > 0 : false,
          distanceKm,
        };
      })
      .filter((p) => p.distanceKm == null || p.distanceKm <= radiusKm);

    res.json({ posts: withDistance, nextCursor });
  }),
);

postsRouter.post(
  "/",
  requireAuth,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const post = await prisma.post.create({
      data: {
        authorId: req.user!.id,
        content: req.body.content,
        category: req.body.category,
        latitude: req.body.latitude ?? me?.latitude,
        longitude: req.body.longitude ?? me?.longitude,
        address: req.body.address ?? me?.address,
        images: req.body.images ?? [],
      },
      include: { author: true, _count: { select: { likes: true, comments: true } } },
    });
    const payload = {
      id: post.id,
      content: post.content,
      category: post.category,
      latitude: post.latitude,
      longitude: post.longitude,
      address: post.address,
      images: post.images,
      shareCount: 0,
      createdAt: post.createdAt,
      author: toPublicUser(post.author),
      likeCount: 0,
      commentCount: 0,
      liked: false,
    };
    emitFeed("post:new", payload);
    res.status(201).json({ post: payload });
  }),
);

postsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: true,
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { likes: true, comments: true } },
        likes: req.user ? { where: { userId: req.user.id } } : false,
      },
    });
    if (!post) throw notFound("Post not found");
    res.json({
      post: {
        id: post.id,
        content: post.content,
        category: post.category,
        latitude: post.latitude,
        longitude: post.longitude,
        address: post.address,
        images: post.images,
        shareCount: post.shareCount,
        createdAt: post.createdAt,
        author: toPublicUser(post.author),
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        liked: Array.isArray(post.likes) ? post.likes.length > 0 : false,
        comments: post.comments.map((c) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt,
          author: toPublicUser(c.author),
        })),
      },
    });
  }),
);

postsRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw notFound("Post not found");
    if (post.authorId !== req.user!.id && req.user!.role !== "ADMIN") throw forbidden();
    await prisma.post.delete({ where: { id: post.id } });
    res.json({ ok: true });
  }),
);

postsRouter.post(
  "/:id/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw notFound("Post not found");
    const existing = await prisma.like.findUnique({
      where: { postId_userId: { postId: post.id, userId: req.user!.id } },
    });
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      res.json({ liked: false });
      return;
    }
    await prisma.like.create({ data: { postId: post.id, userId: req.user!.id } });
    emitFeed("post:like", { postId: post.id, userId: req.user!.id });
    res.json({ liked: true });
  }),
);

postsRouter.post(
  "/:id/comments",
  requireAuth,
  validate(z.object({ body: z.string().min(1).max(1000) })),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw notFound("Post not found");
    const comment = await prisma.comment.create({
      data: { postId: post.id, authorId: req.user!.id, body: req.body.body },
      include: { author: true },
    });
    emitFeed("post:comment", {
      postId: post.id,
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        author: toPublicUser(comment.author),
      },
    });
    res.status(201).json({
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        author: toPublicUser(comment.author),
      },
    });
  }),
);

postsRouter.post(
  "/:id/share",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw notFound("Post not found");
    await prisma.share.create({ data: { postId: post.id, userId: req.user!.id } });
    const updated = await prisma.post.update({
      where: { id: post.id },
      data: { shareCount: { increment: 1 } },
    });
    res.json({ shareCount: updated.shareCount });
  }),
);

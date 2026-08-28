import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { notFound } from "../../lib/errors";
import { toPublicUser } from "../../lib/serializers";
import { validate } from "../../middleware/errorHandler";
import { requireAuth, requireRole } from "../../middleware/auth";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [users, bookings, services, openReports, openDisputes, platform] = await Promise.all([
      prisma.user.count(),
      prisma.booking.groupBy({ by: ["status"], _count: true }),
      prisma.service.count({ where: { isActive: true } }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
      prisma.platformBalance.findUnique({ where: { id: "platform" } }),
    ]);
    const verified = await prisma.user.count({ where: { verificationStatus: "VERIFIED" } });
    res.json({
      users,
      verified,
      services,
      openReports,
      openDisputes,
      platformBalanceCents: platform?.balanceCents ?? 0,
      bookings: Object.fromEntries(bookings.map((b) => [b.status, b._count])),
    });
  }),
);

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({
      users: users.map((u) => ({
        ...toPublicUser(u),
        email: u.email,
        isBanned: u.isBanned,
        isActive: u.isActive,
        city: u.city,
      })),
    });
  }),
);

adminRouter.patch(
  "/users/:id",
  validate(
    z.object({
      isBanned: z.boolean().optional(),
      isActive: z.boolean().optional(),
      role: z.enum(["USER", "PROVIDER", "ADMIN"]).optional(),
      verificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ user: { ...toPublicUser(user), email: user.email, isBanned: user.isBanned } });
  }),
);

adminRouter.get(
  "/bookings",
  asyncHandler(async (_req, res) => {
    const bookings = await prisma.booking.findMany({
      include: { service: true, customer: true, provider: true, payment: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        status: b.status,
        priceCents: b.priceCents,
        commissionCents: b.commissionCents,
        scheduledAt: b.scheduledAt,
        createdAt: b.createdAt,
        service: b.service.title,
        customer: toPublicUser(b.customer),
        provider: toPublicUser(b.provider),
        paymentStatus: b.payment?.status,
      })),
    });
  }),
);

adminRouter.get(
  "/reports",
  asyncHandler(async (_req, res) => {
    const reports = await prisma.report.findMany({
      include: { reporter: true, targetUser: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ reports });
  }),
);

adminRouter.patch(
  "/reports/:id",
  validate(
    z.object({
      status: z.enum(["OPEN", "REVIEWED", "DISMISSED", "ACTION_TAKEN"]),
      adminNote: z.string().max(1000).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ report });
  }),
);

adminRouter.get(
  "/transactions",
  asyncHandler(async (_req, res) => {
    const [ledger, platform] = await Promise.all([
      prisma.ledgerEntry.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.platformLedger.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    res.json({ ledger, platform });
  }),
);

adminRouter.get(
  "/disputes",
  asyncHandler(async (_req, res) => {
    const disputes = await prisma.dispute.findMany({
      include: { opener: true, booking: { include: { service: true, payment: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ disputes });
  }),
);

adminRouter.patch(
  "/disputes/:id",
  validate(
    z.object({
      status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"]),
      resolution: z.string().max(2000).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id } });
    if (!dispute) throw notFound("Dispute not found");
    const updated = await prisma.dispute.update({
      where: { id: dispute.id },
      data: req.body,
    });
    res.json({ dispute: updated });
  }),
);

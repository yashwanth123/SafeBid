import { Router } from "express";
import { z } from "zod";
import { ReportTargetType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { validate } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";

export const reportsRouter = Router();

reportsRouter.post(
  "/",
  requireAuth,
  validate(
    z.object({
      targetType: z.nativeEnum(ReportTargetType),
      targetId: z.string().min(1),
      targetUserId: z.string().optional(),
      reason: z.string().min(3).max(200),
      details: z.string().max(2000).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.id,
        targetType: req.body.targetType,
        targetId: req.body.targetId,
        targetUserId: req.body.targetUserId,
        reason: req.body.reason,
        details: req.body.details,
      },
    });
    res.status(201).json({ report });
  }),
);

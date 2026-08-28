import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { badRequest, forbidden, notFound } from "../../lib/errors";
import { toPublicUser } from "../../lib/serializers";
import { emitToUser } from "../../realtime/socket";
import { notify } from "../../lib/notify";
import { validate } from "../../middleware/errorHandler";
import { requireAuth } from "../../middleware/auth";

export const messagesRouter = Router();

messagesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const convos = await prisma.conversation.findMany({
      where: { OR: [{ userAId: req.user!.id }, { userBId: req.user!.id }] },
      include: {
        userA: true,
        userB: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
    });
    res.json({
      conversations: convos.map((c) => {
        const other = c.userAId === req.user!.id ? c.userB : c.userA;
        return {
          id: c.id,
          other: toPublicUser(other),
          lastMessage: c.messages[0] ?? null,
          lastMessageAt: c.lastMessageAt,
        };
      }),
    });
  }),
);

messagesRouter.post(
  "/",
  requireAuth,
  validate(z.object({ userId: z.string().min(1), body: z.string().min(1).max(2000).optional() })),
  asyncHandler(async (req, res) => {
    if (req.body.userId === req.user!.id) throw badRequest("Cannot message yourself");
    const other = await prisma.user.findUnique({ where: { id: req.body.userId } });
    if (!other) throw notFound("User not found");
    const [a, b] = req.user!.id < other.id ? [req.user!.id, other.id] : [other.id, req.user!.id];
    let convo = await prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId: a, userBId: b } },
    });
    if (!convo) {
      convo = await prisma.conversation.create({ data: { userAId: a, userBId: b } });
    }
    if (req.body.body) {
      const message = await prisma.message.create({
        data: { conversationId: convo.id, senderId: req.user!.id, body: req.body.body },
      });
      await prisma.conversation.update({
        where: { id: convo.id },
        data: { lastMessageAt: new Date() },
      });
      emitToUser(other.id, "message:new", { conversationId: convo.id, message });
    }
    res.status(201).json({ conversationId: convo.id });
  }),
);

messagesRouter.get(
  "/:id/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const convo = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!convo) throw notFound("Conversation not found");
    if (convo.userAId !== req.user!.id && convo.userBId !== req.user!.id) throw forbidden();
    const messages = await prisma.message.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    await prisma.message.updateMany({
      where: { conversationId: convo.id, senderId: { not: req.user!.id }, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ messages });
  }),
);

messagesRouter.post(
  "/:id/messages",
  requireAuth,
  validate(z.object({ body: z.string().min(1).max(2000) })),
  asyncHandler(async (req, res) => {
    const convo = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: { userA: true, userB: true },
    });
    if (!convo) throw notFound("Conversation not found");
    if (convo.userAId !== req.user!.id && convo.userBId !== req.user!.id) throw forbidden();
    const message = await prisma.message.create({
      data: { conversationId: convo.id, senderId: req.user!.id, body: req.body.body },
    });
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { lastMessageAt: new Date() },
    });
    const otherId = convo.userAId === req.user!.id ? convo.userBId : convo.userAId;
    emitToUser(otherId, "message:new", { conversationId: convo.id, message });
    await notify({
      userId: otherId,
      type: "MESSAGE",
      title: "New message",
      body: req.body.body.slice(0, 80),
      data: { conversationId: convo.id },
    });
    res.status(201).json({ message });
  }),
);

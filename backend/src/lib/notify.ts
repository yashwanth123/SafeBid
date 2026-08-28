import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { emitToUser } from "../realtime/socket";

export async function notify(opts: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null>;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      data: (opts.data ?? {}) as Prisma.InputJsonValue,
    },
  });
  emitToUser(opts.userId, "notification", notification);

  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { expoPushToken: true },
  });
  if (user?.expoPushToken) {
    // Push is fire-and-forget; Expo receipt handling can be added later.
    fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: user.expoPushToken,
        title: opts.title,
        body: opts.body,
        data: opts.data ?? {},
      }),
    }).catch(() => undefined);
  }
  return notification;
}

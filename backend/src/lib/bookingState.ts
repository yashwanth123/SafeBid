import { JobStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { AppError, badRequest, forbidden } from "./errors";

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  CREATED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["REVIEWED", "CANCELLED"],
  REVIEWED: [],
  CANCELLED: [],
};

export function assertTransition(from: JobStatus, to: JobStatus) {
  if (!TRANSITIONS[from].includes(to)) {
    throw badRequest(`Cannot move booking from ${from} to ${to}`);
  }
}

export async function transitionBooking(opts: {
  bookingId: string;
  to: JobStatus;
  actorId: string;
  note?: string;
  tx?: Prisma.TransactionClient;
}) {
  const client = opts.tx ?? prisma;
  const booking = await client.booking.findUnique({ where: { id: opts.bookingId } });
  if (!booking) throw new AppError(404, "Booking not found", "NOT_FOUND");
  assertTransition(booking.status, opts.to);

  const updated = await client.booking.update({
    where: { id: booking.id },
    data: { status: opts.to },
  });
  await client.bookingStatusEvent.create({
    data: {
      bookingId: booking.id,
      from: booking.status,
      to: opts.to,
      actorId: opts.actorId,
      note: opts.note,
    },
  });
  return updated;
}

export function assertBookingParticipant(
  booking: { customerId: string; providerId: string },
  userId: string,
  role?: "customer" | "provider",
) {
  const isCustomer = booking.customerId === userId;
  const isProvider = booking.providerId === userId;
  if (!isCustomer && !isProvider) throw forbidden("Not a participant of this booking");
  if (role === "customer" && !isCustomer) throw forbidden("Only the customer can do this");
  if (role === "provider" && !isProvider) throw forbidden("Only the provider can do this");
}

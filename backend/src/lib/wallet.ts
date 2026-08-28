import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "./prisma";
import { AppError } from "./errors";

type WalletRow = {
  id: string;
  userId: string;
  availableBalanceCents: number;
  pendingBalanceCents: number;
  version: number;
};

export async function ensureWallet(userId: string, tx: Prisma.TransactionClient = prisma) {
  const existing = await tx.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return tx.wallet.create({ data: { userId } });
}

export async function lockWallet(userId: string, tx: Prisma.TransactionClient): Promise<WalletRow> {
  await ensureWallet(userId, tx);
  const rows = await tx.$queryRaw<WalletRow[]>`
    SELECT id, "userId", "availableBalanceCents", "pendingBalanceCents", version
    FROM wallets
    WHERE "userId" = ${userId}
    FOR UPDATE
  `;
  if (!rows[0]) throw new AppError(500, "Wallet lock failed", "WALLET_LOCK");
  return rows[0];
}

export async function lockPlatform(tx: Prisma.TransactionClient) {
  await tx.platformBalance.upsert({
    where: { id: "platform" },
    create: { id: "platform", balanceCents: 0 },
    update: {},
  });
  const rows = await tx.$queryRaw<{ id: string; balanceCents: number }[]>`
    SELECT id, "balanceCents" FROM platform_balance WHERE id = 'platform' FOR UPDATE
  `;
  return rows[0];
}

export async function applyWalletChange(
  tx: Prisma.TransactionClient,
  opts: {
    userId: string;
    availableDelta: number;
    pendingDelta: number;
    type: TransactionType;
    amountCents: number;
    bookingId?: string;
    stripeRef?: string;
    description: string;
  },
) {
  const wallet = await lockWallet(opts.userId, tx);
  const available = wallet.availableBalanceCents + opts.availableDelta;
  const pending = wallet.pendingBalanceCents + opts.pendingDelta;
  if (available < 0 || pending < 0) {
    throw new AppError(409, "Insufficient wallet balance", "INSUFFICIENT_FUNDS");
  }

  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      availableBalanceCents: available,
      pendingBalanceCents: pending,
      version: { increment: 1 },
    },
  });

  return tx.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      type: opts.type,
      amountCents: opts.amountCents,
      availableAfter: available,
      pendingAfter: pending,
      bookingId: opts.bookingId,
      stripeRef: opts.stripeRef,
      description: opts.description,
    },
  });
}

export async function creditPlatform(
  tx: Prisma.TransactionClient,
  opts: { amountCents: number; type: TransactionType; bookingId?: string; description: string },
) {
  const platform = await lockPlatform(tx);
  const next = platform.balanceCents + opts.amountCents;
  await tx.platformBalance.update({
    where: { id: "platform" },
    data: { balanceCents: next },
  });
  return tx.platformLedger.create({
    data: {
      type: opts.type,
      amountCents: opts.amountCents,
      balanceAfter: next,
      bookingId: opts.bookingId,
      description: opts.description,
    },
  });
}

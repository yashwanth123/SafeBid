import { User } from "@prisma/client";

const PUBLIC_FIELDS = [
  "id",
  "name",
  "photoUrl",
  "bio",
  "city",
  "ratingAvg",
  "ratingCount",
  "verificationStatus",
  "role",
  "createdAt",
] as const;

export type PublicUser = Pick<User, (typeof PUBLIC_FIELDS)[number]>;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    photoUrl: user.photoUrl,
    bio: user.bio,
    city: user.city,
    ratingAvg: user.ratingAvg,
    ratingCount: user.ratingCount,
    verificationStatus: user.verificationStatus,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function toMe(user: User) {
  return {
    ...toPublicUser(user),
    email: user.email,
    phone: user.phone,
    address: user.address,
    latitude: user.latitude,
    longitude: user.longitude,
    radiusKm: user.radiusKm,
    twoFactorEnabled: user.twoFactorEnabled,
    stripeAccountId: user.stripeAccountId,
    stripeAccountReady: user.stripeAccountReady,
    authProvider: user.authProvider,
  };
}

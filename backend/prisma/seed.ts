import { PrismaClient, PostCategory, ServiceCategory, Role, VerificationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const AUSTIN = { lat: 30.2672, lng: -97.7431 };

async function main() {
  await prisma.platformBalance.upsert({
    where: { id: "platform" },
    create: { id: "platform", balanceCents: 0 },
    update: {},
  });

  const passwordHash = await bcrypt.hash("Neighborhood1!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@safebid.local" },
    update: {},
    create: {
      email: "admin@safebid.local",
      passwordHash,
      name: "Avery Chen",
      role: Role.ADMIN,
      verificationStatus: VerificationStatus.VERIFIED,
      bio: "SafeBid community moderator.",
      city: "Austin",
      address: "Downtown Austin, TX",
      latitude: AUSTIN.lat,
      longitude: AUSTIN.lng,
      photoUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=Avery",
    },
  });

  const maya = await prisma.user.upsert({
    where: { email: "maya@safebid.local" },
    update: {},
    create: {
      email: "maya@safebid.local",
      passwordHash,
      name: "Maya Patel",
      role: Role.PROVIDER,
      verificationStatus: VerificationStatus.VERIFIED,
      bio: "Neighbor, dog person, and after-school tutor. ID verified.",
      city: "Austin",
      address: "East Cesar Chavez, Austin, TX",
      latitude: AUSTIN.lat + 0.012,
      longitude: AUSTIN.lng + 0.01,
      ratingAvg: 4.9,
      ratingCount: 18,
      photoUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=Maya",
      stripeAccountId: "acct_mock_maya",
      stripeAccountReady: true,
    },
  });

  const luis = await prisma.user.upsert({
    where: { email: "luis@safebid.local" },
    update: {},
    create: {
      email: "luis@safebid.local",
      passwordHash,
      name: "Luis Romero",
      role: Role.PROVIDER,
      verificationStatus: VerificationStatus.VERIFIED,
      bio: "Licensed handyman. Same-week jobs around central Austin.",
      city: "Austin",
      address: "Hyde Park, Austin, TX",
      latitude: AUSTIN.lat + 0.018,
      longitude: AUSTIN.lng - 0.004,
      ratingAvg: 4.8,
      ratingCount: 41,
      photoUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=Luis",
      stripeAccountId: "acct_mock_luis",
      stripeAccountReady: true,
    },
  });

  const jordan = await prisma.user.upsert({
    where: { email: "jordan@safebid.local" },
    update: {},
    create: {
      email: "jordan@safebid.local",
      passwordHash,
      name: "Jordan Blake",
      role: Role.USER,
      verificationStatus: VerificationStatus.UNVERIFIED,
      bio: "New to the block — looking for a reliable sitter and a plumber.",
      city: "Austin",
      address: "Travis Heights, Austin, TX",
      latitude: AUSTIN.lat - 0.01,
      longitude: AUSTIN.lng + 0.006,
      photoUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=Jordan",
    },
  });

  for (const user of [admin, maya, luis, jordan]) {
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }

  const existingServices = await prisma.service.count();
  if (existingServices === 0) {
    await prisma.service.createMany({
      data: [
        {
          providerId: maya.id,
          title: "Weekday dog walks (30 min)",
          description:
            "Two-loop neighborhood walks with GPS notes after each outing. Treats included. I live two blocks from the trail.",
          priceCents: 2200,
          category: ServiceCategory.PETS,
          latitude: maya.latitude,
          longitude: maya.longitude,
          address: maya.address,
          images: [],
        },
        {
          providerId: maya.id,
          title: "Homework help — grades 3–8",
          description:
            "Math and reading support at your kitchen table or the library. First session is a short fit check.",
          priceCents: 4000,
          category: ServiceCategory.TUTORING,
          latitude: maya.latitude,
          longitude: maya.longitude,
          address: maya.address,
        },
        {
          providerId: luis.id,
          title: "Faucet & drywall patch visit",
          description:
            "Small home repairs that shouldn't wait for a general contractor. I bring basic parts; specialty fixtures extra.",
          priceCents: 8500,
          category: ServiceCategory.HOME,
          latitude: luis.latitude,
          longitude: luis.longitude,
          address: luis.address,
        },
        {
          providerId: luis.id,
          title: "Furniture assembly (2 hours)",
          description: "Shelves, beds, and the infamous 74-piece desk. I recycle the packaging.",
          priceCents: 7000,
          category: ServiceCategory.HOME,
          latitude: luis.latitude,
          longitude: luis.longitude,
          address: luis.address,
        },
      ],
    });
  }

  const existingPosts = await prisma.post.count();
  if (existingPosts === 0) {
    await prisma.post.createMany({
      data: [
        {
          authorId: maya.id,
          content:
            "Lost tortoise? Spotted a small sulcata near the community garden around 6pm. I put out a water dish. Comment if it's yours.",
          category: PostCategory.LOST_FOUND,
          latitude: maya.latitude,
          longitude: maya.longitude,
          address: "East Cesar Chavez community garden",
        },
        {
          authorId: luis.id,
          content:
            "Hyde Park block party this Saturday 4–8. Bring a folding chair. I'll have a spare folding table if anyone needs one.",
          category: PostCategory.EVENTS,
          latitude: luis.latitude,
          longitude: luis.longitude,
          address: "Hyde Park, Austin",
        },
        {
          authorId: jordan.id,
          content:
            "Anyone have a rec for a babysitter who can do a Friday evening? Prefer someone ID-verified on SafeBid.",
          category: PostCategory.RECOMMENDATIONS,
          latitude: jordan.latitude,
          longitude: jordan.longitude,
          address: "Travis Heights",
        },
        {
          authorId: admin.id,
          content:
            "Welcome to the neighborhood feed. Keep it local, keep it kind. Service providers must verify ID before listing jobs.",
          category: PostCategory.GENERAL,
          latitude: AUSTIN.lat,
          longitude: AUSTIN.lng,
          address: "Downtown Austin",
        },
      ],
    });
  }

  console.log("Seeded SafeBid demo users:");
  console.log("  admin@safebid.local / Neighborhood1!");
  console.log("  maya@safebid.local  / Neighborhood1!  (verified provider)");
  console.log("  luis@safebid.local  / Neighborhood1!  (verified provider)");
  console.log("  jordan@safebid.local / Neighborhood1! (neighbor)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

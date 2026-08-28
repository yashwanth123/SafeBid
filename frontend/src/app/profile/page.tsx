"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-forest-100 text-lg font-semibold">
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(user.name)
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl">{user.name}</h1>
            {user.verificationStatus === "VERIFIED" && <Badge tone="verified">Verified</Badge>}
          </div>
          <p className="text-sm text-forest-700/70">
            {user.city || "Location not set"} · {user.role.toLowerCase()}
          </p>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Link href="/verify"><Button className="w-full" variant="secondary">ID verification</Button></Link>
        <Link href="/wallet"><Button className="w-full" variant="secondary">Wallet & payouts</Button></Link>
        <Link href="/bookings"><Button className="w-full" variant="secondary">My jobs</Button></Link>
        <Link href="/onboarding"><Button className="w-full" variant="secondary">Update location</Button></Link>
      </div>
      {user.bio && <p className="text-sm leading-relaxed">{user.bio}</p>}
      <Button variant="outline" onClick={() => logout()}>
        Sign out
      </Button>
    </div>
  );
}

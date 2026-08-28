"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";

const links = [
  { href: "/wallet", label: "Wallet & withdrawals" },
  { href: "/verify", label: "ID verification" },
  { href: "/bookings", label: "Jobs & escrow" },
  { href: "/onboarding", label: "Neighborhood radius" },
  { href: "/admin", label: "Admin console", admin: true },
];

export default function MorePage() {
  const { user } = useAuth();
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-3xl">More</h1>
      {links
        .filter((l) => !l.admin || user?.role === "ADMIN")
        .map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="mb-3">{l.label}</Card>
          </Link>
        ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BookingTimeline } from "@/components/BookingTimeline";

type Booking = {
  id: string;
  status: string;
  priceCents: number;
  scheduledAt: string;
  service: { title: string };
};

export default function BookingsPage() {
  const [role, setRole] = useState<"customer" | "provider">("customer");
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    api<{ bookings: Booking[] }>(`/api/bookings?role=${role}`)
      .then((d) => setBookings(d.bookings))
      .catch((e) => toast.error(e.message));
  }, [role]);

  return (
    <div>
      <h1 className="font-serif text-3xl">Jobs</h1>
      <div className="mt-3 flex gap-2">
        {(["customer", "provider"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`rounded-full px-3 py-1.5 text-sm ${role === r ? "bg-forest-600 text-white" : "bg-white dark:bg-forest-800"}`}
          >
            {r === "customer" ? "I hired" : "I was hired"}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {bookings.map((b) => (
          <Link
            key={b.id}
            href={`/bookings/${b.id}`}
            className="block rounded-3xl border border-forest-100 bg-white/80 p-4 dark:border-forest-800 dark:bg-forest-800/40"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{b.service.title}</div>
              <Badge>{b.status.toLowerCase()}</Badge>
            </div>
            <div className="mt-1 text-sm text-forest-700/70">
              {money(b.priceCents)} · {new Date(b.scheduledAt).toLocaleString()}
            </div>
            <div className="mt-3">
              <BookingTimeline status={b.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

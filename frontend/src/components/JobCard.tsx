"use client";

import Link from "next/link";
import { Badge } from "./ui/badge";
import { money } from "@/lib/utils";

export type JobPost = {
  id: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  suggestedCents: number;
  scheduledAt: string;
  status: string;
  address?: string | null;
  distanceKm?: number | null;
  bookingId?: string | null;
  customer: { id: string; name: string; photoUrl?: string | null };
  claimedBy?: { id: string; name: string } | null;
};

export function JobCard({ job }: { job: JobPost }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-3xl border border-forest-100 bg-white/80 p-5 shadow-lift transition hover:-translate-y-0.5 dark:border-forest-800 dark:bg-forest-800/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge>{job.status === "OPEN" ? "open job" : job.status.toLowerCase()}</Badge>
          <h3 className="mt-2 font-serif text-xl leading-tight">{job.title}</h3>
        </div>
        <div className="text-right">
          <div className="font-semibold">{money(job.priceCents)}</div>
          <div className="text-xs text-forest-700/60">posted price</div>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-forest-700/80 dark:text-forest-100/80">
        {job.description}
      </p>
      <p className="mt-3 text-xs text-forest-700/60">
        {new Date(job.scheduledAt).toLocaleString()}
        {job.distanceKm != null ? ` · ${job.distanceKm.toFixed(1)} km` : ""}
        {job.customer?.name ? ` · ${job.customer.name}` : ""}
      </p>
    </Link>
  );
}

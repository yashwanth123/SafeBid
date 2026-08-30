"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { JobPost } from "@/components/JobCard";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [job, setJob] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await api<{ job: JobPost }>(`/api/jobs/${params.id}`);
    setJob(data.job);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function claim() {
    setLoading(true);
    try {
      const data = await api<{ bookingId: string }>(`/api/jobs/${params.id}/claim`, { method: "POST" });
      toast.success("You took this job at the posted price");
      router.push(`/bookings/${data.bookingId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not take job");
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    try {
      await api(`/api/jobs/${params.id}/cancel`, { method: "POST" });
      toast.success("Job cancelled");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel");
    }
  }

  if (!job) return <p className="text-sm">Loading…</p>;
  const isCustomer = user?.id === job.customer.id;
  const canClaim = user && !isCustomer && job.status === "OPEN";

  return (
    <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
      <div>
        <Badge>{job.status.toLowerCase()}</Badge>
        <h1 className="mt-2 font-serif text-4xl">{job.title}</h1>
        <p className="mt-4 whitespace-pre-wrap leading-relaxed">{job.description}</p>
        <p className="mt-4 text-sm text-forest-700/70">
          Needed {new Date(job.scheduledAt).toLocaleString()}
          {job.address ? ` · ${job.address}` : ""}
        </p>
      </div>
      <Card>
        <div className="text-3xl font-semibold">{money(job.priceCents)}</div>
        <p className="text-xs text-forest-700/60">
          Posted price — take it or skip it. Neighborhood rate {money(job.suggestedCents)}.
        </p>
        <p className="mt-4 text-sm">
          Posted by{" "}
          <Link className="font-medium" href={`/profile/${job.customer.id}`}>
            {job.customer.name}
          </Link>
        </p>
        {job.claimedBy && (
          <p className="mt-2 text-sm">
            Taken by{" "}
            <Link className="font-medium" href={`/profile/${job.claimedBy.id}`}>
              {job.claimedBy.name}
            </Link>
          </p>
        )}
        {canClaim && user.verificationStatus !== "VERIFIED" && (
          <Link href="/verify">
            <Button className="mt-5 w-full" variant="outline">
              Verify ID to take this job
            </Button>
          </Link>
        )}
        {canClaim && user.verificationStatus === "VERIFIED" && (
          <Button className="mt-5 w-full" disabled={loading} onClick={claim}>
            {loading ? "Taking job…" : `I’ll do it for ${money(job.priceCents)}`}
          </Button>
        )}
        {isCustomer && job.status === "OPEN" && (
          <Button className="mt-5 w-full" variant="outline" onClick={cancel}>
            Cancel posting
          </Button>
        )}
        {job.bookingId && (
          <Link href={`/bookings/${job.bookingId}`}>
            <Button className="mt-5 w-full" variant="secondary">
              Open the job
            </Button>
          </Link>
        )}
      </Card>
    </div>
  );
}

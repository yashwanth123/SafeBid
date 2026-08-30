"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { JobCard, type JobPost } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const cats = ["", "HOME", "OUTDOORS", "PETS", "TUTORING", "WELLNESS", "TECH", "MOVING", "OTHER"];

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [category, setCategory] = useState("");
  const [mine, setMine] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (mine) params.set("mine", "1");
    const data = await api<{ jobs: JobPost[] }>(`/api/jobs?${params.toString()}`);
    setJobs(data.jobs);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, mine]);

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Posted jobs</h1>
          <p className="mt-1 max-w-xl text-sm text-forest-700/70">
            One price. First verified neighbor to take it gets the work. No “I’ll do it for $80”
            in the comments.
          </p>
        </div>
        <Link href="/jobs/new">
          <Button>Need work done</Button>
        </Link>
      </div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setMine(false)}
          className={`rounded-full px-3 py-1.5 text-sm ${!mine ? "bg-forest-600 text-white" : "bg-white dark:bg-forest-800"}`}
        >
          Open nearby
        </button>
        {user && (
          <button
            onClick={() => setMine(true)}
            className={`rounded-full px-3 py-1.5 text-sm ${mine ? "bg-forest-600 text-white" : "bg-white dark:bg-forest-800"}`}
          >
            I posted
          </button>
        )}
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto">
        {cats.map((c) => (
          <button
            key={c || "all"}
            onClick={() => setCategory(c)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
              category === c ? "bg-forest-600 text-white" : "bg-white dark:bg-forest-800"
            }`}
          >
            {c ? c.toLowerCase() : "all"}
          </button>
        ))}
      </div>
      {jobs.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-forest-200 p-8 text-center text-sm text-forest-700/70">
          No open jobs on this block yet. Post one with a fair price.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

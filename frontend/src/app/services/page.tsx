"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ServiceCard, type Service } from "@/components/ServiceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

const cats = ["", "HOME", "OUTDOORS", "PETS", "TUTORING", "WELLNESS", "TECH", "MOVING", "OTHER"];

export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    const data = await api<{ services: Service[] }>(`/api/services?${params.toString()}`);
    setServices(data.services);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Hire someone on the block</h1>
          <p className="text-sm text-forest-700/70">
            Book a listed pro at their posted price, or post a job with one fair number. No comment bidding.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/jobs/new">
            <Button>Need work done</Button>
          </Link>
          <Link href="/services/new">
            <Button variant={user?.verificationStatus === "VERIFIED" ? "primary" : "outline"}>
              List a service
            </Button>
          </Link>
        </div>
      </div>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <Input placeholder="Search dog walking, plumbing…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
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
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/jobs" className="text-forest-700 underline dark:text-forest-200">
          Or take an open job at the posted price
        </Link>
      </p>
    </div>
  );
}

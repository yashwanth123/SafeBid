"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

type Rate = {
  category: string;
  label: string;
  unit: string;
  suggestedCents: number;
  minCents: number;
  maxCents: number;
};

export default function NewJobPage() {
  const router = useRouter();
  const [rates, setRates] = useState<Rate[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("HOME");
  const [price, setPrice] = useState(85);
  const [when, setWhen] = useState("");
  const [loading, setLoading] = useState(false);

  const rate = useMemo(() => rates.find((r) => r.category === category), [rates, category]);

  useEffect(() => {
    api<{ rates: Rate[] }>("/api/jobs/rates", { skipAuth: true })
      .then((d) => {
        setRates(d.rates);
        const home = d.rates.find((r) => r.category === "HOME");
        if (home) setPrice(home.suggestedCents / 100);
      })
      .catch((err) => toast.error(err.message));
  }, []);

  useEffect(() => {
    if (rate) setPrice(rate.suggestedCents / 100);
  }, [rate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!when) return toast.error("Pick when you need it done");
    setLoading(true);
    try {
      const data = await api<{ job: { id: string } }>("/api/jobs", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          category,
          priceCents: Math.round(Number(price) * 100),
          scheduledAt: new Date(when).toISOString(),
        }),
      });
      toast.success("Job posted at a locked price");
      router.push(`/jobs/${data.job.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl">Post a job</h1>
      <p className="mt-2 text-sm text-forest-700/70">
        Set one fair price from the neighborhood rate card. Verified neighbors take it or skip it.
        Nobody comments a different number.
      </p>
      <Card className="mt-5">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input required placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            required
            placeholder="What’s included, access notes, parking, pets"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <select
            className="h-11 w-full rounded-2xl border border-forest-200 bg-transparent px-3 text-sm dark:border-forest-700"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {rates.map((r) => (
              <option key={r.category} value={r.category}>
                {r.label}
              </option>
            ))}
          </select>
          {rate && (
            <div className="rounded-2xl bg-forest-50 p-3 text-sm dark:bg-forest-900/60">
              <div className="flex items-center justify-between">
                <span>Posted price</span>
                <strong>{money(Math.round(price * 100))}</strong>
              </div>
              <input
                type="range"
                min={rate.minCents / 100}
                max={rate.maxCents / 100}
                step={5}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="mt-3 w-full"
              />
              <p className="mt-1 text-xs text-forest-700/60">
                Fair band {money(rate.minCents)}–{money(rate.maxCents)} · neighborhood rate{" "}
                {money(rate.suggestedCents)} / {rate.unit}
              </p>
            </div>
          )}
          <Input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} />
          <p className="text-xs text-forest-700/60">
            You pay this amount into escrow after someone takes the job. SafeBid keeps 5% when you
            review the work.
          </p>
          <Button className="w-full" disabled={loading}>
            {loading ? "Posting…" : "Post this price"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

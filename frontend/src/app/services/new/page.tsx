"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
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

export default function NewServicePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rates, setRates] = useState<Rate[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(85);
  const [category, setCategory] = useState("HOME");
  const [loading, setLoading] = useState(false);
  const rate = useMemo(() => rates.find((r) => r.category === category), [rates, category]);

  useEffect(() => {
    api<{ rates: Rate[] }>("/api/jobs/rates", { skipAuth: true })
      .then((d) => {
        setRates(d.rates);
        const home = d.rates.find((r) => r.category === "HOME");
        if (home) setPrice(home.suggestedCents / 100);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (rate) setPrice(rate.suggestedCents / 100);
  }, [rate]);

  if (user && user.verificationStatus !== "VERIFIED") {
    return (
      <Card className="mx-auto max-w-lg">
        <h1 className="font-serif text-2xl">Verify your ID first</h1>
        <p className="mt-2 text-sm text-forest-700/70">
          SafeBid requires government ID + selfie verification before anyone can offer paid work.
        </p>
        <Link href="/verify">
          <Button className="mt-4">Start verification</Button>
        </Link>
      </Card>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api<{ service: { id: string } }>("/api/services", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          priceCents: Math.round(Number(price) * 100),
          category,
        }),
      });
      toast.success("Service listed at a posted price");
      router.push(`/services/${data.service.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not list service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl">Offer a service</h1>
      <p className="mt-2 text-sm text-forest-700/70">
        Your listing price is the contract. Customers book it — they cannot counter in comments.
      </p>
      <Card className="mt-5">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            required
            placeholder="What you do, how long it takes, what’s included"
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
                {money(rate.suggestedCents)}
              </p>
            </div>
          )}
          <p className="text-xs text-forest-700/60">
            Customers pay this amount into escrow. SafeBid keeps 5% when the job is reviewed.
          </p>
          <Button className="w-full" disabled={loading}>
            {loading ? "Publishing…" : "Publish listing"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

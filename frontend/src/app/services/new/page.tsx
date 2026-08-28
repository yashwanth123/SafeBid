"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import Link from "next/link";

const cats = ["HOME", "OUTDOORS", "PETS", "TUTORING", "WELLNESS", "TECH", "MOVING", "OTHER"] as const;

export default function NewServicePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("45");
  const [category, setCategory] = useState<(typeof cats)[number]>("HOME");
  const [loading, setLoading] = useState(false);

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
      toast.success("Service listed");
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
      <Card className="mt-5">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            required
            placeholder="What you do, how long it takes, what’s included"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            type="number"
            min="1"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <select
            className="h-11 w-full rounded-2xl border border-forest-200 bg-transparent px-3 text-sm dark:border-forest-700"
            value={category}
            onChange={(e) => setCategory(e.target.value as (typeof cats)[number])}
          >
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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

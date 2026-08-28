"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import type { Service } from "@/components/ServiceCard";

export default function BookPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ service: Service }>(`/api/services/${params.id}`).then((d) => setService(d.service));
  }, [params.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!when) return toast.error("Pick a date and time");
    setLoading(true);
    try {
      const booking = await api<{ booking: { id: string } }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          serviceId: params.id,
          scheduledAt: new Date(when).toISOString(),
          notes,
        }),
      });
      const pay = await api<{ status: string }>(`/api/payments/bookings/${booking.booking.id}/intent`, {
        method: "POST",
      });
      toast.success(pay.status === "ESCROWED" ? "Paid — funds are in escrow" : "Continue to payment");
      router.push(`/bookings/${booking.booking.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  if (!service) return null;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl">Book {service.title}</h1>
      <p className="mt-1 text-sm text-forest-700/70">
        You’ll pay {money(service.priceCents)} now. It stays frozen until you review the completed job.
      </p>
      <Card className="mt-5">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} />
          <Textarea placeholder="Gate code, pet notes, anything helpful" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button className="w-full" disabled={loading}>
            {loading ? "Holding funds…" : `Pay ${money(service.priceCents)} into escrow`}
          </Button>
        </form>
      </Card>
    </div>
  );
}

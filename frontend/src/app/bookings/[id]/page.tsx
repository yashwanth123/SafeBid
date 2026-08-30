"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { BookingTimeline } from "@/components/BookingTimeline";
import { Badge } from "@/components/ui/badge";

type Booking = {
  id: string;
  status: string;
  priceCents: number;
  commissionCents: number;
  scheduledAt: string;
  notes?: string | null;
  service: { title: string };
  customer: { id: string; name: string };
  provider: { id: string; name: string };
  payment: { status: string } | null;
};

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");

  async function load() {
    const data = await api<{ booking: Booking }>(`/api/bookings/${params.id}`);
    setBooking(data.booking);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function act(path: string, payload?: unknown) {
    try {
      await api(`/api/bookings/${params.id}/${path}`, {
        method: "POST",
        body: payload ? JSON.stringify(payload) : "{}",
      });
      toast.success("Updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  if (!booking) return <p>Loading…</p>;
  const isProvider = user?.id === booking.provider.id;
  const isCustomer = user?.id === booking.customer.id;

  return (
    <div className="space-y-4">
      <div>
        <Badge>{booking.status.toLowerCase()}</Badge>
        <h1 className="mt-2 font-serif text-3xl">{booking.service.title}</h1>
        <p className="text-sm text-forest-700/70">
          {money(booking.priceCents)} · commission {money(booking.commissionCents)} ·{" "}
          {new Date(booking.scheduledAt).toLocaleString()}
        </p>
      </div>
      <BookingTimeline status={booking.status} />
      <Card>
        <p className="text-sm">
          Customer: {booking.customer.name}
          <br />
          Provider: {booking.provider.name}
          <br />
          Payment: {booking.payment?.status ?? "n/a"}
        </p>
        {booking.notes && <p className="mt-3 text-sm italic">{booking.notes}</p>}
      </Card>
      <div className="flex flex-wrap gap-2">
        {isCustomer && booking.status === "CREATED" && booking.payment?.status === "PENDING" && (
          <Button
            onClick={async () => {
              try {
                const pay = await api<{ status: string }>(`/api/payments/bookings/${params.id}/intent`, {
                  method: "POST",
                });
                toast.success(pay.status === "ESCROWED" ? "Funds are in escrow" : "Continue to payment");
                load();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Payment failed");
              }
            }}
          >
            Pay {money(booking.priceCents)} into escrow
          </Button>
        )}
        {isProvider && booking.status === "CREATED" && booking.payment?.status === "PENDING" && (
          <p className="text-sm text-forest-700/70">Waiting for the customer to fund escrow.</p>
        )}
        {isProvider && booking.status === "CREATED" && booking.payment?.status === "ESCROWED" && (
          <Button onClick={() => act("confirm")}>Confirm job</Button>
        )}
        {isProvider && booking.status === "CONFIRMED" && (
          <Button onClick={() => act("start")}>Start job</Button>
        )}
        {isProvider && booking.status === "IN_PROGRESS" && (
          <Button onClick={() => act("complete")}>Mark complete</Button>
        )}
        {(isCustomer || isProvider) && !["REVIEWED", "CANCELLED"].includes(booking.status) && (
          <Button variant="outline" onClick={() => act("cancel", { reason: "Cancelled from app" })}>
            Cancel
          </Button>
        )}
      </div>
      {isCustomer && booking.status === "COMPLETED" && (
        <Card>
          <h2 className="font-serif text-xl">Release escrow with a review</h2>
          <input
            type="range"
            min={1}
            max={5}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="mt-3 w-full"
          />
          <p className="text-sm">{rating} stars</p>
          <Textarea className="mt-2" value={body} onChange={(e) => setBody(e.target.value)} placeholder="How did it go?" />
          <Button className="mt-3" onClick={() => act("review", { rating, body })}>
            Review & release funds
          </Button>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Service } from "@/components/ServiceCard";

export default function ServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);

  useEffect(() => {
    api<{ service: Service }>(`/api/services/${params.id}`)
      .then((d) => setService(d.service))
      .catch((err) => toast.error(err.message));
  }, [params.id]);

  if (!service) return <p className="text-sm">Loading…</p>;

  return (
    <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
      <div>
        <Badge>{service.category.toLowerCase()}</Badge>
        <h1 className="mt-2 font-serif text-4xl">{service.title}</h1>
        <p className="mt-4 whitespace-pre-wrap leading-relaxed">{service.description}</p>
      </div>
      <Card>
        <div className="text-3xl font-semibold">{money(service.priceCents)}</div>
        <p className="text-xs text-forest-700/60">Paid into escrow · 5% platform fee on release</p>
        <p className="mt-4 text-sm">
          Provider{" "}
          <Link className="font-medium" href={`/profile/${service.provider.id}`}>
            {service.provider.name}
          </Link>
        </p>
        <Link href={`/services/${service.id}/book`}>
          <Button className="mt-5 w-full">Book this job</Button>
        </Link>
      </Card>
    </div>
  );
}

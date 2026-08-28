"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ServiceCard, type Service } from "@/components/ServiceCard";

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{
    user: { name: string; bio?: string | null; verificationStatus: string; ratingAvg: number; city?: string | null };
    services: Service[];
  } | null>(null);

  useEffect(() => {
    api<{ user: never; services: Service[] } & { user: { name: string; bio?: string | null; verificationStatus: string; ratingAvg: number; city?: string | null } }>(
      `/api/users/${params.id}`,
    )
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, [params.id]);

  if (!data) return null;
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-3xl">{data.user.name}</h1>
          {data.user.verificationStatus === "VERIFIED" && <Badge tone="verified">Verified</Badge>}
        </div>
        <p className="text-sm text-forest-700/70">
          {data.user.city} · {data.user.ratingAvg.toFixed(1)} avg
        </p>
        {data.user.bio && <p className="mt-3">{data.user.bio}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {data.services.map((s) => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </div>
    </div>
  );
}

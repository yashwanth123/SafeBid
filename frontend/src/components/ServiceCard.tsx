import Link from "next/link";
import { Badge } from "./ui/badge";
import { money, initials } from "@/lib/utils";
import { Star } from "lucide-react";

export type Service = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  category: string;
  address?: string | null;
  distanceKm?: number | null;
  provider: {
    id: string;
    name: string;
    photoUrl?: string | null;
    ratingAvg: number;
    ratingCount: number;
    verificationStatus: string;
  };
};

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/services/${service.id}`}
      className="block rounded-3xl border border-forest-100 bg-white/80 p-5 shadow-lift transition hover:-translate-y-0.5 dark:border-forest-800 dark:bg-forest-800/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge>{service.category.toLowerCase()}</Badge>
          <h3 className="mt-2 font-serif text-xl leading-tight">{service.title}</h3>
        </div>
        <div className="text-right">
          <div className="font-semibold">{money(service.priceCents)}</div>
          <div className="text-xs text-forest-700/60">held in escrow</div>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-forest-700/80 dark:text-forest-100/80">
        {service.description}
      </p>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-forest-100 text-xs font-semibold">
          {service.provider.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={service.provider.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(service.provider.name)
          )}
        </span>
        <span>{service.provider.name}</span>
        {service.provider.verificationStatus === "VERIFIED" && <Badge tone="verified">ID</Badge>}
        <span className="ml-auto inline-flex items-center gap-1 text-forest-700/70">
          <Star size={14} className="fill-clay text-clay" />
          {service.provider.ratingAvg.toFixed(1)}
          <span className="text-xs">({service.provider.ratingCount})</span>
        </span>
      </div>
      {service.distanceKm != null && (
        <p className="mt-2 text-xs text-forest-700/50">{service.distanceKm.toFixed(1)} km away</p>
      )}
    </Link>
  );
}

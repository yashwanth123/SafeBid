import { Badge } from "./ui/badge";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { initials } from "@/lib/utils";

const labels: Record<string, string> = {
  GENERAL: "General",
  EVENTS: "Events",
  LOST_FOUND: "Lost & found",
  RECOMMENDATIONS: "Recs",
  SERVICES: "Services",
  JOBS: "Jobs",
};

export type Post = {
  id: string;
  content: string;
  category: string;
  address?: string | null;
  images: string[];
  createdAt: string;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  liked?: boolean;
  distanceKm?: number | null;
  author: { id: string; name: string; photoUrl?: string | null; verificationStatus: string };
};

export function PostCard({
  post,
  onLike,
}: {
  post: Post;
  onLike?: (id: string) => void;
}) {
  return (
    <article className="rounded-3xl border border-forest-100 bg-white/80 p-5 shadow-lift dark:border-forest-800 dark:bg-forest-800/40">
      <div className="flex items-start gap-3">
        <Link
          href={`/profile/${post.author.id}`}
          className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-forest-100 text-sm font-semibold text-forest-700"
        >
          {post.author.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.author.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(post.author.name)
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/profile/${post.author.id}`} className="font-medium">
              {post.author.name}
            </Link>
            {post.author.verificationStatus === "VERIFIED" && <Badge tone="verified">Verified</Badge>}
            <Badge>{labels[post.category] ?? post.category}</Badge>
          </div>
          <p className="text-xs text-forest-700/60 dark:text-forest-200/60">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            {post.distanceKm != null && ` · ${post.distanceKm.toFixed(1)} km`}
            {post.address ? ` · ${post.address}` : ""}
          </p>
        </div>
      </div>
      <Link href={`/feed/${post.id}`} className="mt-3 block whitespace-pre-wrap text-[15px] leading-relaxed">
        {post.content}
      </Link>
      {post.images?.length > 0 && (
        <div className="mt-3 grid gap-2">
          {post.images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="max-h-72 w-full rounded-2xl object-cover" />
          ))}
        </div>
      )}
      <div className="mt-4 flex gap-4 text-sm text-forest-700/70 dark:text-forest-200/70">
        <button className="inline-flex items-center gap-1.5" onClick={() => onLike?.(post.id)}>
          <Heart size={16} className={post.liked ? "fill-clay text-clay" : ""} />
          {post.likeCount}
        </button>
        <Link href={`/feed/${post.id}`} className="inline-flex items-center gap-1.5">
          <MessageCircle size={16} />
          {post.commentCount}
        </Link>
        <span className="inline-flex items-center gap-1.5">
          <Share2 size={16} />
          {post.shareCount ?? 0}
        </span>
      </div>
    </article>
  );
}

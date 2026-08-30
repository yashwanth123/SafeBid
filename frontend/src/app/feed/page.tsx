"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PostCard, type Post } from "@/components/PostCard";
import { Button } from "@/components/ui/button";

const cats = [
  { id: "", label: "Nearby" },
  { id: "GENERAL", label: "General" },
  { id: "EVENTS", label: "Events" },
  { id: "LOST_FOUND", label: "Lost & found" },
  { id: "RECOMMENDATIONS", label: "Recs" },
];

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(cat = category) {
    setLoading(true);
    try {
      const q = cat ? `?category=${cat}` : "";
      const data = await api<{ posts: Post[] }>(`/api/posts${q}`);
      setPosts(data.posts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load feed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  async function onLike(id: string) {
    await api(`/api/posts/${id}/like`, { method: "POST" });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) }
          : p,
      ),
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">On the block</h1>
          <p className="text-sm text-forest-700/70">
            What neighbors are saying within your radius. Need work done?{" "}
            <Link href="/jobs/new" className="underline">
              Post a priced job
            </Link>
            .
          </p>
        </div>
        <Link href="/feed/new">
          <Button>New post</Button>
        </Link>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
              category === c.id
                ? "bg-forest-600 text-white"
                : "bg-white text-forest-700 dark:bg-forest-800 dark:text-forest-100"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-forest-100/70 dark:bg-forest-800" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-forest-200 p-8 text-center text-sm text-forest-700/70">
          Quiet so far. Be the first to post on this block.
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onLike={onLike} />
          ))}
        </div>
      )}
    </div>
  );
}

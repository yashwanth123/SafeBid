"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PostCard, type Post } from "@/components/PostCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Detail = Post & {
  comments: { id: string; body: string; createdAt: string; author: { id: string; name: string } }[];
};

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<Detail | null>(null);
  const [body, setBody] = useState("");

  async function load() {
    const data = await api<{ post: Detail }>(`/api/posts/${params.id}`);
    setPost(data.post);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function comment(e: FormEvent) {
    e.preventDefault();
    await api(`/api/posts/${params.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    setBody("");
    toast.success("Comment added");
    load();
  }

  if (!post) return <p className="text-sm text-forest-700/60">Loading…</p>;

  return (
    <div className="space-y-4">
      <PostCard post={post} />
      <div className="space-y-3">
        {post.comments.map((c) => (
          <div key={c.id} className="rounded-2xl bg-white/70 p-3 text-sm dark:bg-forest-800/40">
            <div className="font-medium">{c.author.name}</div>
            <p>{c.body}</p>
          </div>
        ))}
      </div>
      <form onSubmit={comment} className="flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a comment" />
        <Button>Send</Button>
      </form>
    </div>
  );
}

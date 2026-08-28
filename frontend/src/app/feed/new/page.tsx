"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

const cats = ["GENERAL", "EVENTS", "LOST_FOUND", "RECOMMENDATIONS", "SERVICES", "JOBS"] as const;

export default function NewPostPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<(typeof cats)[number]>("GENERAL");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    const body = new FormData();
    Array.from(files).forEach((f) => body.append("files", f));
    const data = await api<{ urls: string[] }>("/api/uploads", { method: "POST", body });
    setImages((prev) => [...prev, ...data.urls.map((u) => `${apiUrl}${u}`)]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/api/posts", {
        method: "POST",
        body: JSON.stringify({ content, category, images }),
      });
      toast.success("Posted to the block");
      router.push("/feed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-serif text-3xl">Share with neighbors</h1>
      <Card className="mt-5">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 text-xs ${
                  category === c ? "bg-forest-600 text-white" : "bg-forest-50 dark:bg-forest-900"
                }`}
              >
                {c.replace("_", " ")}
              </button>
            ))}
          </div>
          <Textarea
            required
            placeholder="What’s happening on your street?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <input type="file" accept="image/*" multiple onChange={(e) => onUpload(e.target.files)} />
          <Button className="w-full" disabled={loading}>
            {loading ? "Posting…" : "Publish"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

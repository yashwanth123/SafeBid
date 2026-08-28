"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function MessagesPage() {
  const [convos, setConvos] = useState<
    { id: string; other: { name: string }; lastMessage: { body: string } | null }[]
  >([]);

  useEffect(() => {
    api<{ conversations: typeof convos }>("/api/messages")
      .then((d) => setConvos(d.conversations))
      .catch((e) => toast.error(e.message));
  }, []);

  return (
    <div>
      <h1 className="font-serif text-3xl">Messages</h1>
      <div className="mt-4 space-y-2">
        {convos.length === 0 && (
          <p className="text-sm text-forest-700/70">No threads yet. Message a provider from their profile.</p>
        )}
        {convos.map((c) => (
          <Link
            key={c.id}
            href={`/messages/${c.id}`}
            className="block rounded-3xl bg-white/80 p-4 dark:bg-forest-800/40"
          >
            <div className="font-medium">{c.other.name}</div>
            <div className="text-sm text-forest-700/70">{c.lastMessage?.body ?? "No messages yet"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

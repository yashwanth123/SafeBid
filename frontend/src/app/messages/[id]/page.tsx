"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ThreadPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<{ id: string; body: string; senderId: string }[]>([]);
  const [body, setBody] = useState("");

  async function load() {
    const data = await api<{ messages: typeof messages }>(`/api/messages/${params.id}/messages`);
    setMessages(data.messages);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function send(e: FormEvent) {
    e.preventDefault();
    await api(`/api/messages/${params.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    setBody("");
    load();
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.senderId === user?.id ? "ml-auto bg-forest-600 text-white" : "bg-white dark:bg-forest-800"
            }`}
          >
            {m.body}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="mt-4 flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" />
        <Button>Send</Button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function VerifyPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const data = await api<{ mock: boolean; url?: string | null; status: string }>(
        "/api/identity/session",
        { method: "POST" },
      );
      if (data.mock) {
        toast.message("Demo mode: completing a simulated Stripe Identity check");
      } else if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start verification");
    } finally {
      setLoading(false);
    }
  }

  async function complete(outcome: "verified" | "rejected") {
    await api("/api/identity/mock/complete", {
      method: "POST",
      body: JSON.stringify({ outcome }),
    });
    await refreshUser();
    toast.success(outcome === "verified" ? "You’re verified" : "Marked as rejected");
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-serif text-3xl">Prove you’re a real neighbor</h1>
      <p className="text-sm text-forest-700/70">
        Providers upload a government ID and a matching selfie. SafeBid stores the verification
        status (pending / verified / rejected) for legal protection if a job goes badly wrong. Document
        images live with Stripe Identity, not on our servers.
      </p>
      <Card>
        <div className="flex items-center justify-between">
          <span>Current status</span>
          <Badge tone={user?.verificationStatus === "VERIFIED" ? "verified" : "muted"}>
            {user?.verificationStatus}
          </Badge>
        </div>
        <Button className="mt-4 w-full" disabled={loading || user?.verificationStatus === "VERIFIED"} onClick={start}>
          {loading ? "Starting…" : "Start ID check"}
        </Button>
        {user?.verificationStatus === "PENDING" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => complete("verified")}>
              Simulate pass
            </Button>
            <Button variant="outline" onClick={() => complete("rejected")}>
              Simulate fail
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

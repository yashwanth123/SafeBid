"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth, type Me } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  const { setSession } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRequired, setInviteRequired] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ inviteRequired: boolean }>("/api/meta", { skipAuth: true })
      .then((m) => setInviteRequired(m.inviteRequired))
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accepted) {
      toast.error("Please confirm this is a private beta.");
      return;
    }
    setLoading(true);
    try {
      const data = await api<{ accessToken: string; refreshToken: string; user: Me }>(
        "/api/auth/register",
        {
          method: "POST",
          skipAuth: true,
          body: JSON.stringify({ name, email, password, inviteCode }),
        },
      );
      setSession(data.accessToken, data.refreshToken, data.user);
      toast.success("Account created. Let’s set your block.");
      router.push("/onboarding");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pt-8">
      <h1 className="font-serif text-4xl">Just the essentials.</h1>
      <p className="mt-2 text-sm text-forest-700/70">
        Name, email, password, and an invite. We’ll pin your street on the next screen.
      </p>
      <Card className="mt-6">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            required
            minLength={8}
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            required={inviteRequired}
            placeholder="Invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <label className="flex items-start gap-2 text-xs text-forest-700/80">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            I understand this is a private friends beta. Payments and ID checks are simulated until
            Stripe is live.
          </label>
          <Button className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm">
        Already have a key?{" "}
        <Link href="/login" className="font-medium text-forest-600">
          Sign in
        </Link>
      </p>
    </div>
  );
}

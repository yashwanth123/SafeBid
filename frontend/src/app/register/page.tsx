"use client";

import { FormEvent, useState } from "react";
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
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api<{ accessToken: string; refreshToken: string; user: Me }>(
        "/api/auth/register",
        {
          method: "POST",
          skipAuth: true,
          body: JSON.stringify({ name, email, password }),
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
        Name, email, password. We’ll ask for your street on the next screen.
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

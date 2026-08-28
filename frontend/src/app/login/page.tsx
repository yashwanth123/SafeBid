"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth, type Me } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const { setSession } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needOtp, setNeedOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api<{ accessToken: string; refreshToken: string; user: Me }>(
        "/api/auth/login",
        {
          method: "POST",
          skipAuth: true,
          body: JSON.stringify({ email, password, otp: otp || undefined }),
        },
      );
      setSession(data.accessToken, data.refreshToken, data.user);
      toast.success("Welcome back.");
      router.push(data.user.latitude ? "/feed" : "/onboarding");
    } catch (err) {
      if (err instanceof ApiError && err.code === "OTP_REQUIRED") {
        setNeedOtp(true);
        toast.message("Enter your authenticator code");
      } else {
        toast.error(err instanceof Error ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pt-8">
      <h1 className="font-serif text-4xl">Come inside.</h1>
      <p className="mt-2 text-sm text-forest-700/70">Use the email you signed up with.</p>
      <Card className="mt-6">
        <form onSubmit={onSubmit} className="space-y-3">
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {needOtp && (
            <Input
              placeholder="Authenticator code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          )}
          <Button className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm">
        New on the block?{" "}
        <Link href="/register" className="font-medium text-forest-600">
          Create an account
        </Link>
      </p>
    </div>
  );
}

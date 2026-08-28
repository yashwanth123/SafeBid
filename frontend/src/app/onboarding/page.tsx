"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function OnboardingPage() {
  const { refreshUser, user } = useAuth();
  const router = useRouter();
  const [city, setCity] = useState(user?.city ?? "Austin");
  const [address, setAddress] = useState(user?.address ?? "");
  const [lat, setLat] = useState(user?.latitude ?? 30.2672);
  const [lng, setLng] = useState(user?.longitude ?? -97.7431);
  const [loading, setLoading] = useState(false);

  function useBrowserLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        toast.success("Pinned your current location");
      },
      () => toast.error("Location permission denied — drop a pin by typing an address instead"),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ city, address, latitude: lat, longitude: lng, radiusKm: 6 }),
      });
      await refreshUser();
      toast.success("Your neighborhood radius is set.");
      router.push("/feed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save location");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg pt-4">
      <h1 className="font-serif text-4xl">Where should we look?</h1>
      <p className="mt-2 text-sm text-forest-700/70">
        We only use this to filter the feed and nearby jobs. You can change it later.
      </p>
      <Card className="mt-6">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input
            placeholder="Street or landmark"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(Number(e.target.value))}
            />
            <Input
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) => setLng(Number(e.target.value))}
            />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={useBrowserLocation}>
            Use my current location
          </Button>
          <Button className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Show me the block"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

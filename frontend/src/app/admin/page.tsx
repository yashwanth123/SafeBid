"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Stats = {
  users: number;
  verified: number;
  services: number;
  openReports: number;
  openDisputes: number;
  platformBalanceCents: number;
  bookings: Record<string, number>;
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string; email: string; verificationStatus: string; isBanned: boolean }[]>([]);
  const [q, setQ] = useState("");
  const [reports, setReports] = useState<{ id: string; reason: string; status: string; targetType: string }[]>([]);
  const [bookings, setBookings] = useState<{ id: string; status: string; service: string; priceCents: number }[]>([]);

  async function load() {
    const [s, u, r, b] = await Promise.all([
      api<Stats>("/api/admin/stats"),
      api<{ users: typeof users }>(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
      api<{ reports: typeof reports }>("/api/admin/reports"),
      api<{ bookings: typeof bookings }>("/api/admin/bookings"),
    ]);
    setStats(s);
    setUsers(u.users);
    setReports(r.reports);
    setBookings(b.bookings);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function moderate(id: string, isBanned: boolean) {
    await api(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ isBanned }) });
    toast.success(isBanned ? "User banned" : "User reinstated");
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Operations</h1>
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            ["Neighbors", stats.users],
            ["Verified IDs", stats.verified],
            ["Live services", stats.services],
            ["Open reports", stats.openReports],
            ["Open disputes", stats.openDisputes],
            ["Platform take", money(stats.platformBalanceCents)],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <p className="text-xs uppercase tracking-wide text-forest-700/60">{label}</p>
              <p className="font-serif text-2xl">{value}</p>
            </Card>
          ))}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <Input placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button>Search</Button>
      </form>
      <Card>
        <h2 className="font-serif text-xl">People</h2>
        <div className="mt-3 divide-y divide-forest-100 text-sm dark:divide-forest-800">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-forest-700/60">
                  {u.email} · {u.verificationStatus}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => moderate(u.id, !u.isBanned)}>
                {u.isBanned ? "Reinstate" : "Ban"}
              </Button>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="font-serif text-xl">Jobs</h2>
        <div className="mt-3 space-y-2 text-sm">
          {bookings.map((b) => (
            <div key={b.id} className="flex justify-between">
              <span>{b.service}</span>
              <span>
                {b.status} · {money(b.priceCents)}
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="font-serif text-xl">Reports</h2>
        <div className="mt-3 space-y-2 text-sm">
          {reports.map((r) => (
            <div key={r.id}>
              {r.targetType}: {r.reason} ({r.status})
            </div>
          ))}
          {reports.length === 0 && <p className="text-forest-700/60">Queue is clear.</p>}
        </div>
      </Card>
    </div>
  );
}

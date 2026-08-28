"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Wallet = {
  availableBalanceCents: number;
  pendingBalanceCents: number;
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [entries, setEntries] = useState<{ id: string; type: string; amountCents: number; description: string; createdAt: string }[]>([]);
  const [amount, setAmount] = useState("50");

  async function load() {
    const data = await api<{ wallet: Wallet; entries: typeof entries }>("/api/payments/wallet");
    setWallet(data.wallet);
    setEntries(data.entries);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
  }, []);

  async function connect() {
    const data = await api<{ url: string | null; mock?: boolean }>("/api/payments/connect/onboard", {
      method: "POST",
    });
    if (data.url) window.location.href = data.url;
    else {
      toast.success("Demo Connect account ready");
      load();
    }
  }

  async function withdraw(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/payments/withdraw", {
        method: "POST",
        body: JSON.stringify({ amountCents: Math.round(Number(amount) * 100) }),
      });
      toast.success("Withdrawal submitted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdraw failed");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl">Wallet</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="text-xs uppercase tracking-wide text-forest-700/60">Available</p>
          <p className="font-serif text-3xl">{money(wallet?.availableBalanceCents ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-forest-700/60">In escrow</p>
          <p className="font-serif text-3xl">{money(wallet?.pendingBalanceCents ?? 0)}</p>
        </Card>
      </div>
      <Button onClick={connect}>Connect payouts (Stripe Connect)</Button>
      <Card>
        <form onSubmit={withdraw} className="flex gap-2">
          <Input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button>Withdraw</Button>
        </form>
      </Card>
      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="flex justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm dark:bg-forest-800/40">
            <div>
              <div className="font-medium">{e.type}</div>
              <div className="text-xs text-forest-700/60">{e.description}</div>
            </div>
            <div>{money(e.amountCents)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

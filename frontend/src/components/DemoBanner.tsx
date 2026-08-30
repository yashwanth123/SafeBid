"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function DemoBanner() {
  const [mock, setMock] = useState(false);
  useEffect(() => {
    api<{ mockPayments: boolean; mockIdentity: boolean }>("/api/meta", { skipAuth: true })
      .then((m) => setMock(m.mockPayments || m.mockIdentity))
      .catch(() => undefined);
  }, []);
  if (!mock) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      Private beta — payments and ID checks are simulated until Stripe is connected. Do not send real
      money or government IDs yet.
    </div>
  );
}

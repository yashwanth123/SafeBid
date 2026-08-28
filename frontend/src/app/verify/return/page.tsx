"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VerifyReturnPage() {
  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="font-serif text-2xl">Thanks — we’re checking your ID</h1>
      <p className="mt-2 text-sm text-forest-700/70">
        Stripe Identity will notify SafeBid when the document and selfie match. You can keep using the
        feed in the meantime.
      </p>
      <Link href="/verify">
        <Button className="mt-4">Back to verification status</Button>
      </Link>
    </Card>
  );
}

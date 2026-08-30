import Link from "next/link";
import { Scale, ShieldCheck, MapPin, Banknote, BadgeCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="space-y-16 pb-8">
      <section className="relative overflow-hidden rounded-[2.2rem] bg-forest-600 px-6 py-16 text-white md:px-12 md:py-20">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-forest-400/40 blur-3xl" />
        <p className="text-sm uppercase tracking-[0.2em] text-forest-100">Private friends beta</p>
        <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight md:text-6xl">
          Know the person. Hold the payment. Live next door.
        </h1>
        <p className="mt-5 max-w-xl text-forest-50/90">
          SafeBid is a neighborhood feed and a fair-price jobs board. One posted price. First
          verified neighbor to take it gets the work. Money sits in escrow until you review.
          Invite-only for now — you need a code from Yashwanth.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-forest-700"
          >
            Join with an invite
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium"
          >
            I already live here
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {[
          {
            icon: Scale,
            title: "One fair price",
            body: "Nextdoor lets ten people comment ten prices. Here the listing is the contract. Take it or skip it — then escrow makes the job real.",
          },
          {
            icon: MapPin,
            title: "Hyperlocal feed",
            body: "Posts, lost & found, and recs from people inside your walking radius — not the whole internet. Hiring belongs on Jobs, not in comments.",
          },
          {
            icon: BadgeCheck,
            title: "ID on file",
            body: "Service providers upload a government ID and selfie via Stripe Identity. We keep verification status, not the document image.",
          },
          {
            icon: Banknote,
            title: "Escrow, then release",
            body: "You pay when you book. Money is frozen until you review the work. Then the provider is paid minus 5%.",
          },
          {
            icon: ShieldCheck,
            title: "A paper trail",
            body: "Every job has a state machine, every dollar has a ledger snapshot, and disputes have a human queue.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-forest-100 bg-white/70 p-6 dark:border-forest-800 dark:bg-forest-800/40"
          >
            <item.icon className="text-forest-600" />
            <h2 className="mt-3 font-serif text-2xl">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-forest-700/80 dark:text-forest-100/80">
              {item.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

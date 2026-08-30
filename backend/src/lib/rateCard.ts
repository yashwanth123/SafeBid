import { ServiceCategory } from "@prisma/client";
import { badRequest } from "./errors";

export type Rate = {
  category: ServiceCategory;
  label: string;
  unit: string;
  suggestedCents: number;
  minCents: number;
  maxCents: number;
};

/** Neighborhood rate card. Posted prices must sit in this band — no comment bidding. */
export const RATE_CARD: Record<ServiceCategory, Rate> = {
  HOME: {
    category: "HOME",
    label: "Home repair visit",
    unit: "visit",
    suggestedCents: 8500,
    minCents: 4000,
    maxCents: 20000,
  },
  OUTDOORS: {
    category: "OUTDOORS",
    label: "Yard / outdoor job",
    unit: "visit",
    suggestedCents: 5500,
    minCents: 2500,
    maxCents: 15000,
  },
  PETS: {
    category: "PETS",
    label: "Pet care",
    unit: "visit",
    suggestedCents: 2500,
    minCents: 1500,
    maxCents: 6000,
  },
  TUTORING: {
    category: "TUTORING",
    label: "Tutoring session",
    unit: "session",
    suggestedCents: 4500,
    minCents: 2500,
    maxCents: 9000,
  },
  WELLNESS: {
    category: "WELLNESS",
    label: "Wellness visit",
    unit: "session",
    suggestedCents: 6000,
    minCents: 3000,
    maxCents: 15000,
  },
  TECH: {
    category: "TECH",
    label: "Tech help",
    unit: "visit",
    suggestedCents: 7500,
    minCents: 4000,
    maxCents: 20000,
  },
  MOVING: {
    category: "MOVING",
    label: "Moving help",
    unit: "job",
    suggestedCents: 9000,
    minCents: 5000,
    maxCents: 25000,
  },
  OTHER: {
    category: "OTHER",
    label: "Neighborhood job",
    unit: "job",
    suggestedCents: 5000,
    minCents: 2000,
    maxCents: 15000,
  },
};

export function listRates(): Rate[] {
  return Object.values(RATE_CARD);
}

export function getRate(category: ServiceCategory): Rate {
  return RATE_CARD[category];
}

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export function assertFairPrice(category: ServiceCategory, priceCents: number) {
  const rate = getRate(category);
  if (priceCents < rate.minCents || priceCents > rate.maxCents) {
    throw badRequest(
      `Fair price for ${rate.label} is ${dollars(rate.minCents)}–${dollars(rate.maxCents)} (neighborhood rate ${dollars(rate.suggestedCents)}). Pick a number on the card — no bidding.`,
      { ...rate, priceCents },
    );
  }
}

/** Nextdoor-style “I’ll do it for $80” comments. Jobs use a posted price instead. */
export function looksLikePriceQuote(body: string) {
  const text = body.trim();
  if (/^\$?\s*\d{1,5}(\.\d{2})?\s*(\/hr|\/hour|an hour|per hour|flat|cash|obo)?\.?$/i.test(text)) {
    return true;
  }
  return /(?:i can (?:do|do it)|i'?ll do it|i would do it|charge|quote|bid|my price|i'?ll take it).{0,40}\$\s*\d/i.test(
    text,
  );
}

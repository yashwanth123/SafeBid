import Stripe from "stripe";
import { env } from "../config/env";

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!stripe) {
    stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

export function requireStripe(): Stripe {
  const client = getStripe();
  if (!client) {
    throw new Error("Stripe is not configured");
  }
  return client;
}

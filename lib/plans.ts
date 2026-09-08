/** Subscription tiers for Sketch2CAD (Stripe test mode). */

export type PlanId = "free" | "starter" | "pro" | "team";

export interface PlanDef {
  id: PlanId;
  name: string;
  priceMonthly: number; // display USD
  blurb: string;
  features: string[];
  /** Env var holding Stripe Price ID (test) */
  priceEnv?: string;
  highlighted?: boolean;
  cta: string;
}

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    blurb: "Explore freehand + basic floor plans.",
    features: [
      "Freehand multi-view sketching",
      "Basic floor plan walls",
      "Local voice commands (heuristic)",
      "3 projects",
      "Export CadQuery script",
    ],
    cta: "Start free",
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 19,
    blurb: "For indie makers shipping one building at a time.",
    features: [
      "Everything in Free",
      "Doors & windows openings",
      "Unlimited projects",
      "STEP / STL export",
      "Email support",
    ],
    priceEnv: "STRIPE_PRICE_STARTER",
    cta: "Subscribe · Starter",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 49,
    blurb: "Voice co-pilot + architecture production workflow.",
    features: [
      "Everything in Starter",
      "OpenAI Realtime voice tools",
      "Room generators & multi-room plans",
      "Priority rebuild queue",
      "Priority support",
    ],
    priceEnv: "STRIPE_PRICE_PRO",
    highlighted: true,
    cta: "Subscribe · Pro",
  },
  {
    id: "team",
    name: "Team",
    priceMonthly: 149,
    blurb: "Studios collaborating on live plans.",
    features: [
      "Everything in Pro",
      "5 seats included",
      "Shared project library",
      "SSO-ready (soon)",
      "SLA support",
    ],
    priceEnv: "STRIPE_PRICE_TEAM",
    cta: "Subscribe · Team",
  },
];

export function priceIdForPlan(id: PlanId): string | null {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan?.priceEnv) return null;
  return process.env[plan.priceEnv] || null;
}

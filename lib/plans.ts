export type PlanId = "free" | "starter" | "pro" | "team";

export interface PlanDef {
  id: PlanId;
  name: string;
  priceMonthly: number;
  blurb: string;
  features: string[];
  priceEnv?: string;
  /** Built-in test Price IDs (Svavar Stripe test account) — override via env */
  defaultPriceId?: string;
  highlighted?: boolean;
  cta: string;
  entitlements: string[];
}

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    blurb: "Explore freehand + basic floor plans.",
    features: ["Freehand multi-view", "Basic walls", "Local voice", "3 projects", "CadQuery script"],
    cta: "Start free",
    entitlements: ["studio", "freehand", "basic_walls", "voice_local"],
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 19,
    blurb: "Indie makers shipping one building at a time.",
    features: ["Doors & windows", "Unlimited projects", "STEP/STL via CAD worker", "IFC export", "Dimensions"],
    priceEnv: "STRIPE_PRICE_STARTER",
    defaultPriceId: "price_1UDWjJK7Uj7Zs6DgCms3BcaD",
    cta: "Subscribe · Starter",
    entitlements: ["studio", "freehand", "doors_windows", "export_step", "export_ifc", "dimensions", "unlimited_projects"],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 49,
    blurb: "Voice co-pilot + production architecture.",
    features: ["OpenAI Realtime voice", "Ollama tools", "Multi-room + interior walls", "Priority rebuild"],
    priceEnv: "STRIPE_PRICE_PRO",
    defaultPriceId: "price_1UDWjMK7Uj7Zs6Dg4Kdq4KUF",
    highlighted: true,
    cta: "Subscribe · Pro",
    entitlements: ["studio", "freehand", "doors_windows", "export_step", "export_ifc", "dimensions", "unlimited_projects", "voice_realtime", "voice_ollama", "multi_room", "wall_mesh_3d"],
  },
  {
    id: "team",
    name: "Team",
    priceMonthly: 149,
    blurb: "Studios collaborating on live plans.",
    features: ["5 seats", "Shared library", "SLA support"],
    priceEnv: "STRIPE_PRICE_TEAM",
    defaultPriceId: "price_1UDWjOK7Uj7Zs6DgLF0NbDq2",
    cta: "Subscribe · Team",
    entitlements: ["studio", "freehand", "doors_windows", "export_step", "export_ifc", "dimensions", "unlimited_projects", "voice_realtime", "voice_ollama", "multi_room", "wall_mesh_3d", "team_seats"],
  },
];

export function priceIdForPlan(id: PlanId): string | null {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan?.priceEnv && !plan?.defaultPriceId) return null;
  return (plan.priceEnv && process.env[plan.priceEnv]) || plan.defaultPriceId || null;
}

export function planFromPriceId(priceId: string): PlanId {
  for (const p of PLANS) {
    const id = (p.priceEnv && process.env[p.priceEnv]) || p.defaultPriceId;
    if (id && id === priceId) return p.id;
  }
  return "starter";
}

export function entitlementsFor(planId: PlanId): string[] {
  return PLANS.find((p) => p.id === planId)?.entitlements || PLANS[0].entitlements;
}

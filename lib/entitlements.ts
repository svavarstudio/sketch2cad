/**
 * Entitlement store (demo).
 * Production: replace with Postgres / KV. For Vercel we use a module map +
 * optional JSON file under /tmp when writable.
 */
import { promises as fs } from "fs";
import path from "path";
import type { PlanId } from "./plans";
import { entitlementsFor } from "./plans";

export interface EntitlementRecord {
  email: string;
  customerId?: string;
  subscriptionId?: string;
  planId: PlanId;
  status: "active" | "canceled" | "trialing" | "past_due" | "none";
  updatedAt: string;
}

const mem = new Map<string, EntitlementRecord>();
const FILE = path.join("/tmp", "sketch2cad-entitlements.json");

async function load(): Promise<void> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const obj = JSON.parse(raw) as Record<string, EntitlementRecord>;
    for (const [k, v] of Object.entries(obj)) mem.set(k.toLowerCase(), v);
  } catch {
    /* first run */
  }
}

async function save(): Promise<void> {
  try {
    const obj: Record<string, EntitlementRecord> = {};
    mem.forEach((v, k) => (obj[k] = v));
    await fs.writeFile(FILE, JSON.stringify(obj, null, 2));
  } catch {
    /* serverless may not allow write — mem still works for warm instance */
  }
}

let primed = false;
async function ensure() {
  if (!primed) {
    await load();
    primed = true;
  }
}

export async function setEntitlement(rec: EntitlementRecord) {
  await ensure();
  mem.set(rec.email.toLowerCase(), rec);
  await save();
}

export async function getEntitlement(email: string): Promise<EntitlementRecord | null> {
  await ensure();
  return mem.get(email.toLowerCase()) || null;
}

export async function listEntitlements(): Promise<EntitlementRecord[]> {
  await ensure();
  return Array.from(mem.values());
}

export function featuresFor(planId: PlanId) {
  return entitlementsFor(planId);
}

import { NextRequest, NextResponse } from "next/server";
import { getEntitlement, setEntitlement } from "@/lib/entitlements";
import { entitlementsFor, type PlanId } from "@/lib/plans";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ planId: "free", features: entitlementsFor("free") });
  const rec = await getEntitlement(email);
  const planId = (rec?.planId || "free") as PlanId;
  return NextResponse.json({
    planId,
    status: rec?.status || "none",
    features: entitlementsFor(planId),
    record: rec,
  });
}

/** Dev helper: set plan without Stripe */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_ENTITLEMENT_POST !== "1") {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }
  const { email, planId } = await req.json();
  if (!email || !planId) return NextResponse.json({ error: "email+planId" }, { status: 400 });
  await setEntitlement({
    email,
    planId,
    status: "active",
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, planId, features: entitlementsFor(planId) });
}

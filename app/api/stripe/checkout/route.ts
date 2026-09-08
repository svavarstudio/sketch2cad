import { NextRequest, NextResponse } from "next/server";
import { getStripe, appUrl } from "@/lib/stripe";
import { priceIdForPlan, type PlanId } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const planId = (body.planId || "pro") as PlanId;
  const email = body.email as string | undefined;
  if (planId === "free") {
    return NextResponse.json({ url: `${appUrl()}/studio` });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY (sk_test_…).", demo: true },
      { status: 503 }
    );
  }

  const priceId = priceIdForPlan(planId);
  if (!priceId) {
    return NextResponse.json({ error: `Missing price for ${planId}` }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/studio?checkout=success&plan=${planId}`,
    cancel_url: `${appUrl()}/pricing?checkout=cancel`,
    allow_promotion_codes: true,
    customer_email: email,
    metadata: { planId },
    subscription_data: { metadata: { planId, email: email || "" } },
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
}

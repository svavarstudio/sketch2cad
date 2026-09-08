import { NextRequest, NextResponse } from "next/server";
import { getStripe, appUrl } from "@/lib/stripe";
import { priceIdForPlan, type PlanId } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const planId = (body.planId || "pro") as PlanId;
  if (planId === "free") {
    return NextResponse.json({ url: `${appUrl()}/studio` });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Add STRIPE_SECRET_KEY (sk_test_...) and STRIPE_PRICE_* to Vercel env / .env.local",
        demo: true,
      },
      { status: 503 }
    );
  }

  const priceId = priceIdForPlan(planId);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `Missing Stripe Price ID for plan "${planId}". Set env ${planId === "starter" ? "STRIPE_PRICE_STARTER" : planId === "pro" ? "STRIPE_PRICE_PRO" : "STRIPE_PRICE_TEAM"}`,
      },
      { status: 400 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/studio?checkout=success&plan=${planId}`,
    cancel_url: `${appUrl()}/pricing?checkout=cancel`,
    allow_promotion_codes: true,
    metadata: { planId },
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
}

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { setEntitlement } from "@/lib/entitlements";
import { planFromPriceId, type PlanId } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await req.text();

  let event: any;
  if (stripe && secret) {
    try {
      const sig = req.headers.get("stripe-signature") || "";
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  } else {
    try {
      event = JSON.parse(raw);
    } catch {
      return NextResponse.json({ received: true, note: "unparsed" });
    }
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.customer_details?.email || session.customer_email;
      const customerId = session.customer as string | undefined;
      let planId: PlanId = (session.metadata?.planId as PlanId) || "starter";
      // Prefer price from line items if available later
      if (email) {
        await setEntitlement({
          email,
          customerId,
          subscriptionId: session.subscription as string | undefined,
          planId,
          status: "active",
          updatedAt: new Date().toISOString(),
        });
      }
    }
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const sub = event.data.object;
      const priceId = sub.items?.data?.[0]?.price?.id;
      const planId = priceId ? planFromPriceId(priceId) : "starter";
      const email = sub.metadata?.email;
      if (email) {
        await setEntitlement({
          email,
          customerId: sub.customer,
          subscriptionId: sub.id,
          planId,
          status: sub.status === "active" || sub.status === "trialing" ? sub.status : "past_due",
          updatedAt: new Date().toISOString(),
        });
      }
    }
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const email = sub.metadata?.email;
      if (email) {
        await setEntitlement({
          email,
          customerId: sub.customer,
          subscriptionId: sub.id,
          planId: "free",
          status: "canceled",
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    console.error("webhook handler", e);
  }

  return NextResponse.json({ received: true });
}

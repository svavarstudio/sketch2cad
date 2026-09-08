import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ received: true, note: "webhook not fully configured" });
  }

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  try {
    const event = stripe.webhooks.constructEvent(raw, sig || "", secret);
    // Persist subscription state in your DB here
    console.log("[stripe webhook]", event.type);
    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

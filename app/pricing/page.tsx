import { Nav } from "@/components/marketing/Nav";
import { PricingCards } from "@/components/marketing/PricingCards";
import { Suspense } from "react";

export const instant = true;

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <h1 style={{ letterSpacing: "-0.03em" }}>Simple pricing</h1>
        <p className="muted" style={{ maxWidth: 520 }}>
          Stripe <strong>test mode</strong> checkout. Use card 4242… after you add test keys & price IDs
          in environment variables.
        </p>
        <div style={{ marginTop: 32 }}>
          <Suspense fallback={<div className="skeleton" style={{ height: 320 }} />}>
            <PricingCards />
          </Suspense>
        </div>
      </main>
    </>
  );
}

"use client";

import { useState } from "react";
import { PLANS, type PlanId } from "@/lib/plans";
import Link from "next/link";

export function PricingCards() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(planId: PlanId) {
    setError(null);
    if (planId === "free") {
      window.location.href = "/studio";
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || "Checkout failed");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="card" style={{ marginBottom: 16, borderColor: "#7f1d1d", color: "#fecaca" }}>
          {error}
          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            Stripe test mode: set <code>STRIPE_SECRET_KEY</code> + <code>STRIPE_PRICE_*</code> in Vercel env.
            Card test: <code>4242 4242 4242 4242</code>
          </div>
        </div>
      )}
      <div className="grid-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className="card"
            style={{
              borderColor: p.highlighted ? "#0ea5e9" : undefined,
              boxShadow: p.highlighted ? "0 0 0 1px #0ea5e9" : undefined,
            }}
          >
            {p.highlighted && <div className="badge">Most popular</div>}
            <h3 style={{ margin: "0 0 4px" }}>{p.name}</h3>
            <div style={{ fontSize: 32, fontWeight: 800 }}>
              ${p.priceMonthly}
              <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>
                /mo
              </span>
            </div>
            <p className="muted" style={{ fontSize: 14 }}>
              {p.blurb}
            </p>
            <ul style={{ paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              className={p.highlighted ? "btn btn-primary" : "btn"}
              style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
              disabled={loading === p.id}
              onClick={() => checkout(p.id)}
            >
              {loading === p.id ? "Redirecting…" : p.cta}
            </button>
            {p.id === "free" && (
              <div style={{ marginTop: 8, textAlign: "center" }}>
                <Link href="/studio" className="muted" style={{ fontSize: 13 }}>
                  or open studio →
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

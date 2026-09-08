import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Suspense } from "react";

/** Instant Navigations: this segment expects an instant shell. */
export const instant = true;

async function FeatureGrid() {
  // Simulated content that can stream; shell stays instant via Suspense parent.
  return (
    <div className="grid-3" style={{ marginTop: 48 }}>
      {[
        ["Multi-view freehand", "Pressure-sensitive pen/touch sketches → parametric CadQuery."],
        ["Architecture mode", "Walls, doors, windows, rooms on a metric floor plan."],
        ["Voice tools", "“Draw a 4×5 m bedroom” via local NLU or OpenAI Realtime."],
        ["Instant Navigations", "Next.js 16.3 partial prefetch + Suspense shells."],
        ["Stripe subscriptions", "Free / Starter / Pro / Team — test mode ready."],
        ["Local-first CAD", "Geometry on CadQuery; no black-box text-to-CAD API."],
      ].map(([t, d]) => (
        <div key={t} className="card">
          <h3 style={{ marginTop: 0 }}>{t}</h3>
          <p className="muted" style={{ marginBottom: 0, fontSize: 14 }}>
            {d}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className="container" style={{ paddingTop: 64, paddingBottom: 80 }}>
        <section className="hero">
          <div className="badge">Next.js 16.3 · Instant Navigations · Stripe test</div>
          <h1>
            Sketch to 3D.
            <br />
            Floor plans that speak.
          </h1>
          <p>
            Sketch2CAD turns freehand sketches and architectural floor plans into editable parametric
            models. Draw on device, talk to place walls and doors, export CadQuery scripts.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <Link href="/studio" className="btn btn-primary">
              Open studio
            </Link>
            <Link href="/pricing" className="btn">
              View pricing
            </Link>
          </div>
        </section>
        <Suspense
          fallback={
            <div className="grid-3" style={{ marginTop: 48 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 120 }} />
              ))}
            </div>
          }
        >
          <FeatureGrid />
        </Suspense>
      </main>
    </>
  );
}

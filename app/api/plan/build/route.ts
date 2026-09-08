import { NextRequest, NextResponse } from "next/server";
import { planToCadQuery, planExtents } from "@/lib/architecture";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const plan = body.plan || { walls: [] };
  const height = body.wall_height_mm || 2700;
  if (!plan.walls?.length) {
    return NextResponse.json({ success: false, error: "No walls" }, { status: 400 });
  }
  const extents = planExtents(plan);
  // Optional CAD worker for real STEP
  let step_url: string | null = null;
  let stl_url: string | null = null;
  const worker = process.env.CAD_WORKER_URL;
  if (worker) {
    try {
      const wr = await fetch(`${worker.replace(/\/$/, "")}/api/plan/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, wall_height_mm: height }),
        signal: AbortSignal.timeout(60000),
      });
      if (wr.ok) {
        const wd = await wr.json();
        step_url = wd.step_url || null;
        stl_url = wd.stl_url || null;
      }
    } catch {
      /* script-only fallback */
    }
  }
  return NextResponse.json({
    success: true,
    job_id: `job_${Date.now()}`,
    cadquery_script: planToCadQuery(plan, height),
    preview_params: {
      length: extents.length / 100,
      width: extents.width / 100,
      height: extents.height / 100,
    },
    walls: plan.walls,
    step_url,
    stl_url,
    confidence: plan.walls.length >= 4 ? 0.88 : 0.7,
    message: `Building shell from ${plan.walls.length} walls` + (step_url ? " (+ STEP from worker)" : ""),
  });
}

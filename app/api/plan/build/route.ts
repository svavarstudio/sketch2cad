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
  return NextResponse.json({
    success: true,
    job_id: `job_${Date.now()}`,
    cadquery_script: planToCadQuery(plan, height),
    preview_params: {
      length: extents.length / 100,
      width: extents.width / 100,
      height: extents.height / 100,
    },
    confidence: plan.walls.length >= 4 ? 0.88 : 0.7,
    message: `Building shell from ${plan.walls.length} walls`,
  });
}

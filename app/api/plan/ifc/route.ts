import { NextRequest, NextResponse } from "next/server";
import { planToIfc } from "@/lib/ifc";

export async function POST(req: NextRequest) {
  const { plan, name } = await req.json();
  if (!plan?.walls?.length) return NextResponse.json({ error: "No walls" }, { status: 400 });
  const ifc = planToIfc(plan, name || "Sketch2CAD");
  return new NextResponse(ifc, {
    headers: {
      "Content-Type": "application/x-step",
      "Content-Disposition": `attachment; filename="${(name || "plan").replace(/\s+/g, "_")}.ifc"`,
    },
  });
}

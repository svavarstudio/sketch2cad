import { NextRequest, NextResponse } from "next/server";
import { heuristicIntent } from "@/lib/tools";

export async function POST(req: NextRequest) {
  const { text, plan } = await req.json();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  return NextResponse.json({ ...heuristicIntent(text, plan || { walls: [], doors: [], windows: [], rooms: [] }), mode: "local_heuristic" });
}

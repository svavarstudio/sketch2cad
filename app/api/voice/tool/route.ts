import { NextRequest, NextResponse } from "next/server";
import { dispatchTool } from "@/lib/tools";

export async function POST(req: NextRequest) {
  const { name, arguments: args, plan } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const result = dispatchTool(name, typeof args === "string" ? JSON.parse(args || "{}") : args || {}, plan || { walls: [], doors: [], windows: [], rooms: [] });
  return NextResponse.json(result);
}

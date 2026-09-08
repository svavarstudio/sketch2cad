import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "sketch2cad-web",
    version: "0.5.0",
    stripe_configured: Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("...")),
    openai_configured: Boolean(process.env.OPENAI_API_KEY),
    ollama_url: process.env.OLLAMA_URL || "http://127.0.0.1:11434",
    cad_worker: process.env.CAD_WORKER_URL || null,
  });
}

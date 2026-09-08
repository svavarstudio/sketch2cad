import { NextResponse } from "next/server";
import { OPENAI_TOOLS } from "@/lib/tools";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview";

export async function POST() {
  const session = {
    model: MODEL,
    modalities: ["audio", "text"],
    instructions:
      "You are Sketch2CAD voice co-pilot for architectural floor plans. Call tools to draw rooms, walls, doors, windows. Convert meters to mm. Prefer wall_ref south/north/east/west/longest. Confirm briefly after each tool.",
    voice: "alloy",
    tools: OPENAI_TOOLS,
    tool_choice: "auto",
    input_audio_transcription: { model: "whisper-1" },
  };

  if (!OPENAI_API_KEY) {
    return NextResponse.json({
      ok: false,
      mode: "local",
      message: "OPENAI_API_KEY not set. Use Ollama or local voice.",
      session,
      tools: OPENAI_TOOLS,
    });
  }

  try {
    // Ephemeral client secret for browser WebRTC (Realtime)
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify(session),
    });
    if (!r.ok) {
      const err = await r.text();
      return NextResponse.json({ ok: true, mode: "openai_config_only", session, api_error: err.slice(0, 500) });
    }
    const data = await r.json();
    return NextResponse.json({ ok: true, mode: "openai_realtime", client_secret: data, session });
  } catch (e: any) {
    return NextResponse.json({ ok: true, mode: "openai_config_only", session, error: String(e.message || e) });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { OPENAI_TOOLS, dispatchTool, heuristicIntent } from "@/lib/tools";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

export async function POST(req: NextRequest) {
  const { text, plan } = await req.json();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  // Try Ollama native tools API (0.3+)
  try {
    const tools = OPENAI_TOOLS.map((t: any) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        tools,
        messages: [
          {
            role: "system",
            content:
              "You are Sketch2CAD voice CAD assistant. Prefer calling tools. Units: user meters → convert to mm (*1000). Wall refs: south/north/east/west/longest.",
          },
          { role: "user", content: text },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (r.ok) {
      const data = await r.json();
      const calls = data.message?.tool_calls || [];
      if (calls.length) {
        const allActions: any[] = [];
        const msgs: string[] = [];
        let planState = plan || { walls: [], doors: [], windows: [], rooms: [] };
        for (const c of calls) {
          const name = c.function?.name || c.name;
          const args = typeof c.function?.arguments === "string" ? JSON.parse(c.function.arguments || "{}") : c.function?.arguments || c.arguments || {};
          const out = dispatchTool(name, args, planState);
          msgs.push(out.message);
          allActions.push(...out.client_actions);
          // optimistic local update for multi-tool
          for (const a of out.client_actions) {
            if (a.type === "add_wall") planState = { ...planState, walls: [...planState.walls, a.wall] };
            if (a.type === "add_room") planState = { ...planState, rooms: [...(planState.rooms || []), a.room] };
          }
        }
        return NextResponse.json({ ok: true, message: msgs.join(" · "), client_actions: allActions, mode: "ollama_tools", model: OLLAMA_MODEL });
      }
      // fallback: ask model for JSON
      const content = data.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const j = JSON.parse(jsonMatch[0]);
          if (j.tool) {
            const out = dispatchTool(j.tool, j.arguments || {}, plan);
            return NextResponse.json({ ...out, mode: "ollama_json", model: OLLAMA_MODEL });
          }
        } catch { /* fallthrough */ }
      }
    }
  } catch (e: any) {
    // Ollama unavailable — heuristic
    const h = heuristicIntent(text, plan || { walls: [], doors: [], windows: [], rooms: [] });
    return NextResponse.json({ ...h, mode: "heuristic_fallback", ollama_error: String(e.message || e) });
  }

  const h = heuristicIntent(text, plan || { walls: [], doors: [], windows: [], rooms: [] });
  return NextResponse.json({ ...h, mode: "heuristic_fallback" });
}

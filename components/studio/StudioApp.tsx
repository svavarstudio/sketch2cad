"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import Link from "next/link";
import WallMeshPreview from "./WallMeshPreview";
import FreehandStudio from "./FreehandStudio";
import RealtimeVoice from "./RealtimeVoice";
import type { ClientAction } from "@/lib/tools";

type Wall = {
  id: string;
  x1: number; y1: number; x2: number; y2: number;
  thickness_mm: number; height_mm: number; label?: string; kind?: string;
};
type FloorPlan = {
  walls: Wall[];
  doors: any[];
  windows: any[];
  rooms: any[];
  dimensions: any[];
};

const VIEW = 12000;
function empty(): FloorPlan {
  return { walls: [], doors: [], windows: [], rooms: [], dimensions: [] };
}

export default function StudioApp() {
  const [mode, setMode] = useState<"architecture" | "freehand">("architecture");
  const [plan, setPlan] = useState<FloorPlan>(empty());
  const [tool, setTool] = useState<"wall" | "door" | "window" | "interior" | "dimension">("wall");
  const [status, setStatus] = useState('Try: "draw a 4 by 5 meter bedroom" · door on south wall');
  const [voice, setVoice] = useState("");
  const [voiceMode, setVoiceMode] = useState<"local" | "ollama">("local");
  const [script, setScript] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState("free");
  const [features, setFeatures] = useState<string[]>([]);
  const draft = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const history = useRef<FloorPlan[]>([]);
  const [, tick] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("s2c_email");
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    if (!email) {
      setPlanId("free");
      setFeatures(["studio", "freehand", "basic_walls", "voice_local"]);
      return;
    }
    fetch(`/api/entitlements?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => {
        setPlanId(d.planId || "free");
        setFeatures(d.features || []);
      })
      .catch(() => {});
  }, [email]);

  const pushHistory = (p: FloorPlan) => {
    history.current = [...history.current.slice(-40), p];
  };

  const applyActions = useCallback((actions: ClientAction[]) => {
    setPlan((prev) => {
      pushHistory(prev);
      let next: FloorPlan = {
        walls: [...prev.walls],
        doors: [...prev.doors],
        windows: [...prev.windows],
        rooms: [...prev.rooms],
        dimensions: [...(prev.dimensions || [])],
      };
      for (const a of actions) {
        if (a.type === "add_wall") next.walls.push(a.wall);
        if (a.type === "add_door") {
          const door = { ...a.door };
          if (!door.wall_id && next.walls[0]) door.wall_id = next.walls[0].id;
          next.doors.push(door);
        }
        if (a.type === "add_window") {
          const win = { ...a.window };
          if (!win.wall_id && next.walls[0]) win.wall_id = next.walls[0].id;
          next.windows.push(win);
        }
        if (a.type === "add_room") next.rooms.push(a.room);
        if (a.type === "add_dimension") next.dimensions.push(a.dimension);
        if (a.type === "clear_plan") next = empty();
        if (a.type === "undo") {
          const h = history.current.pop();
          if (h) next = h;
        }
        if (a.type === "set_mode") setMode(a.mode as any);
        if (a.type === "build_3d") setTimeout(() => build(next), 0);
        if (a.type === "export_ifc") setTimeout(() => exportIfc(next), 0);
        if (a.type === "export_step") setTimeout(() => build(next), 0);
      }
      return next;
    });
  }, []);

  const build = async (p: FloorPlan = plan) => {
    if (!p.walls.length) {
      setStatus("Add walls first");
      return;
    }
    setStatus("Building…");
    const res = await fetch("/api/plan/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: p, wall_height_mm: 2700 }),
    });
    const data = await res.json();
    if (data.success) {
      setStatus(data.message + (data.step_url ? ` · STEP ready` : ""));
      setScript(data.cadquery_script);
      if (data.step_url) window.open(data.step_url, "_blank");
    } else setStatus(data.error || "Failed");
  };

  const exportIfc = async (p: FloorPlan = plan) => {
    const res = await fetch("/api/plan/ifc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: p, name: "Sketch2CAD" }),
    });
    if (!res.ok) {
      setStatus("IFC export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sketch2cad.ifc";
    a.click();
    setStatus("Downloaded IFC");
  };

  const runVoice = async () => {
    if (!voice.trim()) return;
    const endpoint = voiceMode === "ollama" ? "/api/voice/ollama" : "/api/voice/local";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: voice, plan }),
    });
    const data = await res.json();
    setStatus(`${data.message}${data.mode ? ` · ${data.mode}` : ""}`);
    if (data.client_actions?.length) applyActions(data.client_actions);
    setVoice("");
  };

  const loadExample = async () => {
    const res = await fetch("/api/plan/example");
    const data = await res.json();
    pushHistory(plan);
    setPlan({ ...data.plan, dimensions: data.plan.dimensions || [] });
    setStatus("Loaded example bedroom");
  };

  const toPlan = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VIEW, y: ((e.clientY - r.top) / r.height) * VIEW };
  };

  const nearestWall = (x: number, y: number) => {
    let best: Wall | null = null;
    let bestD = Infinity;
    for (const w of plan.walls) {
      const d = distSeg(x, y, w.x1, w.y1, w.x2, w.y2);
      if (d < bestD) {
        bestD = d;
        best = w;
      }
    }
    return bestD < 400 ? best : null;
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toPlan(e);
    if (tool === "wall" || tool === "interior" || tool === "dimension") {
      draft.current = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    } else {
      const w = nearestWall(p.x, p.y);
      if (!w) return;
      const t = Math.max(
        0.05,
        Math.min(
          0.95,
          ((p.x - w.x1) * (w.x2 - w.x1) + (p.y - w.y1) * (w.y2 - w.y1)) /
            (((w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2) || 1)
        )
      );
      pushHistory(plan);
      if (tool === "door") {
        setPlan({
          ...plan,
          doors: [...plan.doors, { id: `d_${Date.now()}`, wall_id: w.id, position_along_wall: t, width_mm: 900, swing: "left", type: "door" }],
        });
      } else {
        setPlan({
          ...plan,
          windows: [
            ...plan.windows,
            { id: `w_${Date.now()}`, wall_id: w.id, position_along_wall: t, width_mm: 1200, sill_height_mm: 900, height_mm: 1200, type: "window" },
          ],
        });
      }
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!draft.current) return;
    const p = toPlan(e);
    let x2 = p.x, y2 = p.y;
    if (e.shiftKey) {
      if (Math.abs(x2 - draft.current.x1) > Math.abs(y2 - draft.current.y1)) y2 = draft.current.y1;
      else x2 = draft.current.x1;
    }
    draft.current = { ...draft.current, x2, y2 };
    tick((n) => n + 1);
  };
  const onUp = () => {
    const d = draft.current;
    draft.current = null;
    if (!d || Math.hypot(d.x2 - d.x1, d.y2 - d.y1) < 50) return;
    pushHistory(plan);
    if (tool === "dimension") {
      const label = `${(Math.hypot(d.x2 - d.x1, d.y2 - d.y1) / 1000).toFixed(2)} m`;
      setPlan({ ...plan, dimensions: [...plan.dimensions, { id: `dim_${Date.now()}`, ...d, label }] });
    } else {
      setPlan({
        ...plan,
        walls: [
          ...plan.walls,
          {
            id: `wall_${Date.now()}`,
            ...d,
            thickness_mm: tool === "interior" ? 100 : 150,
            height_mm: 2700,
            kind: tool === "interior" ? "interior" : "exterior",
          },
        ],
      });
    }
  };

  const saveEmail = () => {
    localStorage.setItem("s2c_email", email);
    setStatus(`Email set for entitlements: ${email}`);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0a0f1a" }}>
      <header style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #1f2937", flexWrap: "wrap" }}>
        <Link href="/" style={{ fontWeight: 800 }}>Sketch2CAD</Link>
        <Link href="/pricing" className="muted" style={{ fontSize: 13 }}>Pricing</Link>
        <button className="btn" style={{ background: mode === "architecture" ? "#0ea5e9" : undefined, color: mode === "architecture" ? "#041016" : undefined }} onClick={() => setMode("architecture")}>Architecture</button>
        <button className="btn" style={{ background: mode === "freehand" ? "#0ea5e9" : undefined, color: mode === "freehand" ? "#041016" : undefined }} onClick={() => setMode("freehand")}>Freehand</button>
        {mode === "architecture" &&
          (["wall", "interior", "door", "window", "dimension"] as const).map((t) => (
            <button key={t} className="btn" style={{ background: tool === t ? "#334155" : undefined }} onClick={() => setTool(t)}>{t}</button>
          ))}
        <button className="btn" onClick={loadExample}>Example</button>
        <button className="btn" onClick={() => { pushHistory(plan); setPlan(empty()); }}>Clear</button>
        <button className="btn btn-primary" onClick={() => build()}>Build 3D</button>
        <button className="btn" onClick={() => exportIfc()}>IFC</button>
        <div style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 12 }}>plan: {planId}</span>
        <select className="btn" value={voiceMode} onChange={(e) => setVoiceMode(e.target.value as any)} title="Voice backend">
          <option value="local">Local NLU</option>
          <option value="ollama">Ollama tools</option>
        </select>
        <RealtimeVoice plan={plan} onActions={applyActions} onMessage={setStatus} />
        <input value={voice} onChange={(e) => setVoice(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runVoice()}
          placeholder='"door on south wall" / "4 by 5 bedroom"'
          style={{ background: "#111827", border: "1px solid #1f2937", color: "#e5e7eb", padding: "7px 10px", borderRadius: 8, minWidth: 200, flex: 1, maxWidth: 320 }} />
        <button className="btn" onClick={runVoice}>Send</button>
      </header>
      <div style={{ padding: "4px 12px", fontSize: 12, color: "#9ca3af", borderBottom: "1px solid #1f2937", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span>{status}</span>
        <span>· {plan.walls.length} walls · {plan.doors.length} doors · {plan.windows.length} windows · {plan.rooms.length} rooms</span>
        <span style={{ flex: 1 }} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email for entitlements"
          style={{ background: "#111827", border: "1px solid #1f2937", color: "#e5e7eb", padding: "4px 8px", borderRadius: 6, width: 180, fontSize: 12 }} />
        <button className="btn" style={{ padding: "4px 8px", fontSize: 12 }} onClick={saveEmail}>Save</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {mode === "freehand" ? (
          <div style={{ flex: 1, minHeight: 0 }}><FreehandStudio /></div>
        ) : (
          <>
            <svg ref={svgRef} viewBox={`0 0 ${VIEW} ${VIEW}`} style={{ flex: 2, background: "#0f172a", touchAction: "none" }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
              {Array.from({ length: 13 }, (_, i) => i * 1000).map((v) => (
                <g key={v}>
                  <line x1={v} y1={0} x2={v} y2={VIEW} stroke="#1e293b" strokeWidth={v % 5000 === 0 ? 10 : 2} />
                  <line x1={0} y1={v} x2={VIEW} y2={v} stroke="#1e293b" strokeWidth={v % 5000 === 0 ? 10 : 2} />
                </g>
              ))}
              {plan.rooms.map((r) => (
                <text key={r.id} x={r.origin_x + r.width_mm / 2} y={r.origin_y + r.depth_mm / 2} fill="#64748b" fontSize={280} textAnchor="middle">{r.name}</text>
              ))}
              {plan.walls.map((w) => (
                <line key={w.id} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                  stroke={w.kind === "interior" ? "#94a3b8" : "#e2e8f0"}
                  strokeWidth={w.thickness_mm} strokeLinecap="square" />
              ))}
              {plan.dimensions?.map((d) => (
                <g key={d.id}>
                  <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke="#fbbf24" strokeWidth={30} />
                  <text x={(d.x1 + d.x2) / 2} y={(d.y1 + d.y2) / 2 - 80} fill="#fbbf24" fontSize={160} textAnchor="middle">{d.label}</text>
                </g>
              ))}
              {plan.doors.map((d) => {
                const w = plan.walls.find((x) => x.id === d.wall_id);
                if (!w) return null;
                const cx = w.x1 + (w.x2 - w.x1) * d.position_along_wall;
                const cy = w.y1 + (w.y2 - w.y1) * d.position_along_wall;
                return <circle key={d.id} cx={cx} cy={cy} r={400} fill="none" stroke="#fbbf24" strokeWidth={40} />;
              })}
              {plan.windows.map((win) => {
                const w = plan.walls.find((x) => x.id === win.wall_id);
                if (!w) return null;
                const cx = w.x1 + (w.x2 - w.x1) * win.position_along_wall;
                const cy = w.y1 + (w.y2 - w.y1) * win.position_along_wall;
                return <rect key={win.id} x={cx - 600} y={cy - 80} width={1200} height={160} fill="#0ea5e9" opacity={0.7} />;
              })}
              {draft.current && (
                <line x1={draft.current.x1} y1={draft.current.y1} x2={draft.current.x2} y2={draft.current.y2}
                  stroke="#22c55e" strokeWidth={tool === "dimension" ? 40 : 150} opacity={0.7} />
              )}
              <text x={200} y={400} fill="#64748b" fontSize={220}>FLOOR PLAN · 1 square = 1 m</text>
            </svg>
            <div style={{ flex: 1, minWidth: 240, borderLeft: "1px solid #1f2937", display: "flex", flexDirection: "column" }}>
              <div className="muted" style={{ padding: 8, fontSize: 12 }}>Wall mesh 3D</div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <WallMeshPreview walls={plan.walls} />
              </div>
            </div>
          </>
        )}
      </div>
      {script && (
        <details style={{ maxHeight: 140, overflow: "auto", borderTop: "1px solid #1f2937", background: "#111827" }}>
          <summary style={{ padding: 8, cursor: "pointer" }}>CadQuery script</summary>
          <pre style={{ margin: 0, padding: 12, fontSize: 11, whiteSpace: "pre-wrap" }}>{script}</pre>
        </details>
      )}
    </div>
  );
}

function distSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

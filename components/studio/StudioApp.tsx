"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";

type Wall = {
  id: string;
  x1: number; y1: number; x2: number; y2: number;
  thickness_mm: number; height_mm: number; label?: string;
};
type FloorPlan = {
  walls: Wall[];
  doors: any[];
  windows: any[];
  rooms: any[];
};

const VIEW = 12000;

function empty(): FloorPlan {
  return { walls: [], doors: [], windows: [], rooms: [] };
}

export default function StudioApp() {
  const [plan, setPlan] = useState<FloorPlan>(empty());
  const [tool, setTool] = useState<"wall" | "door" | "window">("wall");
  const [status, setStatus] = useState("Drag walls · Shift=ortho · or type a voice command");
  const [voice, setVoice] = useState("");
  const [script, setScript] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ length: number; width: number; height: number } | null>(null);
  const draft = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const history = useRef<FloorPlan[]>([]);

  const toPlan = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * VIEW,
      y: ((e.clientY - r.top) / r.height) * VIEW,
    };
  };

  const applyActions = useCallback((actions: any[]) => {
    setPlan((prev) => {
      history.current.push(prev);
      let next = {
        walls: [...prev.walls],
        doors: [...prev.doors],
        windows: [...prev.windows],
        rooms: [...prev.rooms],
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
        if (a.type === "clear_plan") next = empty();
        if (a.type === "undo") {
          const h = history.current.pop();
          if (h) next = h as any;
        }
        if (a.type === "build_3d") setTimeout(() => build(next), 0);
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
      setStatus(data.message);
      setScript(data.cadquery_script);
      setPreview(data.preview_params);
    } else setStatus(data.error || "Failed");
  };

  const runVoice = async () => {
    if (!voice.trim()) return;
    const res = await fetch("/api/voice/local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: voice, plan }),
    });
    const data = await res.json();
    setStatus(data.message);
    if (data.client_actions?.length) applyActions(data.client_actions);
    setVoice("");
  };

  const loadExample = async () => {
    const res = await fetch("/api/plan/example");
    const data = await res.json();
    history.current.push(plan);
    setPlan(data.plan);
    setStatus("Loaded example bedroom");
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toPlan(e);
    if (tool === "wall") draft.current = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    else {
      // place door/window on nearest wall
      let best: Wall | null = null;
      let bestD = 1e9;
      for (const w of plan.walls) {
        const d = distSeg(p.x, p.y, w.x1, w.y1, w.x2, w.y2);
        if (d < bestD) {
          bestD = d;
          best = w;
        }
      }
      if (!best || bestD > 400) return;
      const t = Math.max(0.05, Math.min(0.95, ((p.x - best.x1) * (best.x2 - best.x1) + (p.y - best.y1) * (best.y2 - best.y1)) / (((best.x2 - best.x1) ** 2 + (best.y2 - best.y1) ** 2) || 1)));
      history.current.push(plan);
      if (tool === "door") {
        setPlan({
          ...plan,
          doors: [...plan.doors, { id: `d_${Date.now()}`, wall_id: best.id, position_along_wall: t, width_mm: 900, swing: "left", type: "door" }],
        });
      } else {
        setPlan({
          ...plan,
          windows: [...plan.windows, { id: `w_${Date.now()}`, wall_id: best.id, position_along_wall: t, width_mm: 1200, sill_height_mm: 900, height_mm: 1200, type: "window" }],
        });
      }
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!draft.current) return;
    const p = toPlan(e);
    let { x: x2, y: y2 } = p;
    if (e.shiftKey) {
      if (Math.abs(x2 - draft.current.x1) > Math.abs(y2 - draft.current.y1)) y2 = draft.current.y1;
      else x2 = draft.current.x1;
    }
    draft.current = { ...draft.current, x2, y2 };
    // force re-render
    setStatus((s) => s);
  };
  const onUp = () => {
    const d = draft.current;
    draft.current = null;
    if (!d) return;
    if (Math.hypot(d.x2 - d.x1, d.y2 - d.y1) < 50) return;
    history.current.push(plan);
    setPlan({
      ...plan,
      walls: [
        ...plan.walls,
        {
          id: `wall_${Date.now()}`,
          x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2,
          thickness_mm: 150, height_mm: 2700,
        },
      ],
    });
  };

  const [, tick] = useState(0);
  // re-render while drafting
  if (draft.current) {
    // noop — parent move sets status
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0a0f1a" }}>
      <header
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "10px 14px",
          borderBottom: "1px solid #1f2937",
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={{ fontWeight: 800 }}>
          Sketch2CAD
        </Link>
        <Link href="/pricing" className="muted" style={{ fontSize: 13 }}>
          Pricing
        </Link>
        {(["wall", "door", "window"] as const).map((t) => (
          <button
            key={t}
            className="btn"
            style={{ background: tool === t ? "#0ea5e9" : undefined, color: tool === t ? "#041016" : undefined }}
            onClick={() => setTool(t)}
          >
            {t}
          </button>
        ))}
        <button className="btn" onClick={loadExample}>
          Example
        </button>
        <button className="btn" onClick={() => { history.current.push(plan); setPlan(empty()); }}>
          Clear
        </button>
        <button className="btn btn-primary" onClick={() => build()}>
          Build 3D
        </button>
        <div style={{ flex: 1 }} />
        <input
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runVoice()}
          placeholder='“draw a 4 by 5 meter bedroom”'
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            color: "#e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            minWidth: 240,
            flex: 1,
            maxWidth: 360,
          }}
        />
        <button className="btn" onClick={runVoice}>
          Send
        </button>
      </header>
      <div style={{ padding: "6px 14px", fontSize: 12, color: "#9ca3af", borderBottom: "1px solid #1f2937" }}>
        {status} · {plan.walls.length} walls · {plan.doors.length} doors · {plan.windows.length} windows
        {preview && (
          <span>
            {" "}
            · preview {preview.length.toFixed(0)}×{preview.width.toFixed(0)}×{preview.height.toFixed(0)}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          style={{ flex: 1, background: "#0f172a", touchAction: "none" }}
          onPointerDown={onDown}
          onPointerMove={(e) => {
            onMove(e);
            tick((n) => n + 1);
          }}
          onPointerUp={onUp}
        >
          {Array.from({ length: 13 }, (_, i) => i * 1000).map((v) => (
            <g key={v}>
              <line x1={v} y1={0} x2={v} y2={VIEW} stroke="#1e293b" strokeWidth={v % 5000 === 0 ? 10 : 2} />
              <line x1={0} y1={v} x2={VIEW} y2={v} stroke="#1e293b" strokeWidth={v % 5000 === 0 ? 10 : 2} />
            </g>
          ))}
          {plan.rooms.map((r) => (
            <text key={r.id} x={r.origin_x + r.width_mm / 2} y={r.origin_y + r.depth_mm / 2} fill="#64748b" fontSize={280} textAnchor="middle">
              {r.name}
            </text>
          ))}
          {plan.walls.map((w) => (
            <line key={w.id} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke="#e2e8f0" strokeWidth={w.thickness_mm} strokeLinecap="square" />
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
            <line x1={draft.current.x1} y1={draft.current.y1} x2={draft.current.x2} y2={draft.current.y2} stroke="#22c55e" strokeWidth={150} opacity={0.7} />
          )}
          <text x={200} y={400} fill="#64748b" fontSize={220}>
            FLOOR PLAN · 1 square = 1 m
          </text>
        </svg>
      </div>
      {script && (
        <details style={{ maxHeight: 160, overflow: "auto", borderTop: "1px solid #1f2937", background: "#111827" }}>
          <summary style={{ padding: 10, cursor: "pointer" }}>CadQuery script</summary>
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

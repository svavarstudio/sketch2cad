"use client";

import { useRef, useState, useCallback } from "react";
import { getStroke } from "perfect-freehand";

type Pt = { x: number; y: number; p: number };
type Stroke = { id: string; view: string; points: Pt[]; color: string };

const VIEWS = ["front", "top", "side"] as const;

function strokePath(points: number[][]) {
  if (!points.length) return "";
  const d = points.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", points[0][0], points[0][1], "Q"] as (string | number)[]
  );
  d.push("Z");
  return d.join(" ");
}

/**
 * Multi-view freehand sketch (pressure via perfect-freehand).
 */
export default function FreehandStudio() {
  const [view, setView] = useState<(typeof VIEWS)[number]>("front");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawing = useRef<Pt[]>([]);
  const [live, setLive] = useState<Pt[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const toLocal = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 800,
      y: ((e.clientY - r.top) / r.height) * 600,
      p: Math.min(1, Math.max(0.05, (e as any).pressure || 0.5)),
    };
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = [toLocal(e)];
    setLive([...drawing.current]);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current.length) return;
    drawing.current.push(toLocal(e));
    setLive([...drawing.current]);
  };
  const onUp = () => {
    if (drawing.current.length > 2) {
      setStrokes((s) => [
        ...s,
        { id: `s_${Date.now()}`, view, points: drawing.current, color: "#e2e8f0" },
      ]);
    }
    drawing.current = [];
    setLive([]);
  };

  const outline = useCallback((pts: Pt[]) => {
    const input = pts.map((p) => [p.x, p.y, p.p]);
    return getStroke(input, { size: 8, thinning: 0.6, smoothing: 0.5, streamline: 0.5 });
  }, []);

  const viewStrokes = strokes.filter((s) => s.view === view);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: 6, padding: 8 }}>
        {VIEWS.map((v) => (
          <button
            key={v}
            className="btn"
            style={{ background: view === v ? "#0ea5e9" : undefined, color: view === v ? "#041016" : undefined, textTransform: "capitalize" }}
            onClick={() => setView(v)}
          >
            {v}
          </button>
        ))}
        <button className="btn" onClick={() => setStrokes((s) => s.filter((x) => x.view !== view))}>
          Clear view
        </button>
        <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>
          {strokes.length} strokes · freehand multi-view
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 800 600"
        style={{ flex: 1, background: "#0f172a", touchAction: "none", display: "block", width: "100%" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      >
        {/* crosshair */}
        <line x1={400} y1={0} x2={400} y2={600} stroke="#1e293b" />
        <line x1={0} y1={300} x2={800} y2={300} stroke="#1e293b" />
        {viewStrokes.map((s) => (
          <path key={s.id} d={strokePath(outline(s.points))} fill={s.color} opacity={0.9} />
        ))}
        {live.length > 1 && <path d={strokePath(outline(live))} fill="#38bdf8" opacity={0.8} />}
        <text x={16} y={28} fill="#64748b" fontSize={14}>
          {view.toUpperCase()} · pressure-sensitive
        </text>
      </svg>
    </div>
  );
}

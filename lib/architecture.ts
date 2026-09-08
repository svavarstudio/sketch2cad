/** Server-side plan → CadQuery script (no CadQuery runtime on Vercel). */

export interface Wall {
  id: string;
  x1: number; y1: number; x2: number; y2: number;
  thickness_mm?: number;
  height_mm?: number;
  label?: string;
}
export interface FloorPlan {
  walls: Wall[];
  doors?: any[];
  windows?: any[];
  rooms?: any[];
}

function wallPoly(x1: number, y1: number, x2: number, y2: number, t: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const hx = (nx * t) / 2, hy = (ny * t) / 2;
  return [
    [x1 + hx, y1 + hy],
    [x2 + hx, y2 + hy],
    [x2 - hx, y2 - hy],
    [x1 - hx, y1 - hy],
  ];
}

export function planToCadQuery(plan: FloorPlan, height = 2700): string {
  const lines = [
    "# Sketch2CAD architectural shell (generated)",
    "import cadquery as cq",
    f"default_height = {height}",
    "parts = []",
    "",
  ];
  (plan.walls || []).forEach((w, i) => {
    const t = w.thickness_mm ?? 150;
    const h = w.height_mm ?? height;
    const poly = wallPoly(w.x1, w.y1, w.x2, w.y2, t);
    const pts = poly.map((p) => `(${p[0].toFixed(2)}, ${p[1].toFixed(2)})`).join(", ");
    lines.push(`w${i} = cq.Workplane("XY").polyline([${pts}]).close().extrude(${h})`);
    lines.push(`parts.append(w${i})`);
  });
  lines.push("result = parts[0] if parts else cq.Workplane('XY').box(10,10,10)");
  lines.push("for p in parts[1:]: result = result.union(p)");
  lines.push("show_object = result");
  return lines.join("\n");
}

export function planExtents(plan: FloorPlan) {
  const xs: number[] = [], ys: number[] = [];
  for (const w of plan.walls || []) {
    xs.push(w.x1, w.x2); ys.push(w.y1, w.y2);
  }
  if (!xs.length) return { length: 50, width: 40, height: 27 };
  return {
    length: Math.max(...xs) - Math.min(...xs) || 5000,
    width: Math.max(...ys) - Math.min(...ys) || 4000,
    height: 2700,
  };
}

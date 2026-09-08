/** Local voice tool dispatch (mirrors Python registry). */

export type ClientAction =
  | { type: "add_wall"; wall: any }
  | { type: "add_door"; door: any }
  | { type: "add_window"; window: any }
  | { type: "add_room"; room: any }
  | { type: "clear_plan" }
  | { type: "build_3d"; wall_height_mm?: number }
  | { type: "undo" }
  | { type: "set_mode"; mode: string };

function uid(p = "w") {
  return `${p}_${Math.random().toString(16).slice(2, 10)}`;
}

export function dispatchLocalVoice(text: string, plan: any = {}) {
  const t = text.trim().toLowerCase();
  if (t.includes("clear")) return { ok: true, message: "Cleared plan.", client_actions: [{ type: "clear_plan" as const }] };
  if (t.includes("undo")) return { ok: true, message: "Undo.", client_actions: [{ type: "undo" as const }] };
  if (t.includes("build") || t.includes("3d"))
    return { ok: true, message: "Building 3D…", client_actions: [{ type: "build_3d" as const, wall_height_mm: 2700 }] };
  if (t.includes("status")) {
    const n = plan?.walls?.length || 0;
    return { ok: true, message: `Plan has ${n} walls.`, client_actions: [] as ClientAction[] };
  }
  if (t.includes("bedroom") || t.includes("room")) {
    const m = t.match(/(\d+(?:\.\d+)?)\s*(?:by|x|×)\s*(\d+(?:\.\d+)?)/);
    const w = m ? parseFloat(m[1]) * 1000 : 4000;
    const d = m ? parseFloat(m[2]) * 1000 : 5000;
    const name = t.includes("bedroom") ? "Bedroom" : "Room";
    const corners: [number, number][] = [[0, 0], [w, 0], [w, d], [0, d]];
    const walls = [];
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = corners[i];
      const [x2, y2] = corners[(i + 1) % 4];
      walls.push({ id: uid("wall"), type: "wall", x1, y1, x2, y2, thickness_mm: 150, height_mm: 2700, label: `${name}-W${i + 1}` });
    }
    const room = { id: uid("room"), name, origin_x: 0, origin_y: 0, width_mm: w, depth_mm: d, wall_ids: walls.map((x) => x.id) };
    const actions: ClientAction[] = walls.map((wall) => ({ type: "add_wall", wall }));
    actions.push({ type: "add_room", room });
    return { ok: true, message: `Created ${name} ${w / 1000}m × ${d / 1000}m.`, client_actions: actions };
  }
  if (t.includes("door")) {
    return {
      ok: true,
      message: "Added door.",
      client_actions: [{ type: "add_door" as const, door: { id: uid("door"), type: "door", position_along_wall: 0.5, width_mm: 900, swing: "left" } }],
    };
  }
  if (t.includes("window")) {
    return {
      ok: true,
      message: "Added window.",
      client_actions: [{ type: "add_window" as const, window: { id: uid("win"), type: "window", position_along_wall: 0.5, width_mm: 1200, sill_height_mm: 900, height_mm: 1200 } }],
    };
  }
  return {
    ok: true,
    message: `Heard: "${text}". Try "draw a 4 by 5 meter bedroom", "add a door", "build 3d".`,
    client_actions: [] as ClientAction[],
  };
}

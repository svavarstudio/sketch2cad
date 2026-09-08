/** Shared CAD tool schemas + executors for OpenAI Realtime, Ollama, and heuristics. */

export type FloorPlan = {
  walls: any[];
  doors: any[];
  windows: any[];
  rooms: any[];
  dimensions?: any[];
  interior_walls?: any[];
};

export type ClientAction =
  | { type: "add_wall"; wall: any }
  | { type: "add_door"; door: any }
  | { type: "add_window"; window: any }
  | { type: "add_room"; room: any }
  | { type: "add_dimension"; dimension: any }
  | { type: "add_interior_wall"; wall: any }
  | { type: "clear_plan" }
  | { type: "build_3d"; wall_height_mm?: number }
  | { type: "undo" }
  | { type: "set_mode"; mode: string }
  | { type: "export_ifc" }
  | { type: "export_step" };

function uid(p = "w") {
  return `${p}_${Math.random().toString(16).slice(2, 10)}`;
}

export const OPENAI_TOOLS = [
  {
    type: "function",
    name: "draw_wall",
    description: "Draw a wall from (x1,y1) to (x2,y2) in plan mm.",
    parameters: {
      type: "object",
      properties: {
        x1: { type: "number" }, y1: { type: "number" }, x2: { type: "number" }, y2: { type: "number" },
        thickness_mm: { type: "number" }, height_mm: { type: "number" },
        kind: { type: "string", enum: ["exterior", "interior"], default: "exterior" },
        label: { type: "string" },
      },
      required: ["x1", "y1", "x2", "y2"],
    },
  },
  {
    type: "function",
    name: "draw_room_rectangle",
    description: "Create a rectangular room with 4 exterior walls. Size in mm or pass meters via width_m.",
    parameters: {
      type: "object",
      properties: {
        origin_x: { type: "number" }, origin_y: { type: "number" },
        width_mm: { type: "number" }, depth_mm: { type: "number" },
        width_m: { type: "number" }, depth_m: { type: "number" },
        name: { type: "string" }, wall_thickness_mm: { type: "number" },
      },
      required: [],
    },
  },
  {
    type: "function",
    name: "add_door",
    description: "Place a door. Prefer wall_ref like 'south', 'north', 'longest', 'east', 'west' or wall_id.",
    parameters: {
      type: "object",
      properties: {
        wall_id: { type: "string" },
        wall_ref: { type: "string", description: "south|north|east|west|longest|shortest" },
        position_along_wall: { type: "number", description: "0-1, default 0.5 middle" },
        width_mm: { type: "number" },
        swing: { type: "string", enum: ["left", "right", "double"] },
      },
      required: [],
    },
  },
  {
    type: "function",
    name: "add_window",
    description: "Place a window on a wall using wall_ref or wall_id.",
    parameters: {
      type: "object",
      properties: {
        wall_id: { type: "string" },
        wall_ref: { type: "string" },
        position_along_wall: { type: "number" },
        width_mm: { type: "number" },
        sill_height_mm: { type: "number" },
        height_mm: { type: "number" },
      },
      required: [],
    },
  },
  {
    type: "function",
    name: "add_interior_wall",
    description: "Add an interior partition wall across a room.",
    parameters: {
      type: "object",
      properties: {
        x1: { type: "number" }, y1: { type: "number" }, x2: { type: "number" }, y2: { type: "number" },
        thickness_mm: { type: "number" },
      },
      required: ["x1", "y1", "x2", "y2"],
    },
  },
  {
    type: "function",
    name: "add_dimension",
    description: "Add a dimension string between two points in plan mm.",
    parameters: {
      type: "object",
      properties: {
        x1: { type: "number" }, y1: { type: "number" }, x2: { type: "number" }, y2: { type: "number" },
        label: { type: "string" },
      },
      required: ["x1", "y1", "x2", "y2"],
    },
  },
  {
    type: "function",
    name: "build_3d",
    description: "Extrude walls to 3D massing.",
    parameters: { type: "object", properties: { wall_height_mm: { type: "number" } }, required: [] },
  },
  {
    type: "function",
    name: "export_ifc",
    description: "Export IFC model of the plan.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    type: "function",
    name: "export_step",
    description: "Request STEP export via CAD worker.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    type: "function",
    name: "set_mode",
    description: "Switch UI mode: architecture | freehand",
    parameters: {
      type: "object",
      properties: { mode: { type: "string", enum: ["architecture", "freehand"] } },
      required: ["mode"],
    },
  },
  {
    type: "function",
    name: "undo",
    description: "Undo last action",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    type: "function",
    name: "clear_plan",
    description: "Clear the plan",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    type: "function",
    name: "speak_status",
    description: "Report counts on the plan",
    parameters: { type: "object", properties: {}, required: [] },
  },
];

export function resolveWall(plan: FloorPlan, wall_id?: string, wall_ref?: string) {
  const walls = plan.walls || [];
  if (!walls.length) return null;
  if (wall_id) {
    const w = walls.find((x) => x.id === wall_id);
    if (w) return w;
  }
  const ref = (wall_ref || "").toLowerCase();
  if (!ref) return walls[0];

  const mid = (w: any) => ({ mx: (w.x1 + w.x2) / 2, my: (w.y1 + w.y2) / 2, len: Math.hypot(w.x2 - w.x1, w.y2 - w.y1) });
  const xs = walls.flatMap((w) => [w.x1, w.x2]);
  const ys = walls.flatMap((w) => [w.y1, w.y2]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  if (ref === "longest") return walls.reduce((a, b) => (mid(a).len >= mid(b).len ? a : b));
  if (ref === "shortest") return walls.reduce((a, b) => (mid(a).len <= mid(b).len ? a : b));
  if (ref === "south") return walls.reduce((a, b) => (mid(a).my >= mid(b).my ? a : b)); // larger Y as south in our canvas
  if (ref === "north") return walls.reduce((a, b) => (mid(a).my <= mid(b).my ? a : b));
  if (ref === "east") return walls.reduce((a, b) => (mid(a).mx >= mid(b).mx ? a : b));
  if (ref === "west") return walls.reduce((a, b) => (mid(a).mx <= mid(b).mx ? a : b));
  // "middle of longest wall"
  if (ref.includes("longest") || ref.includes("long")) return walls.reduce((a, b) => (mid(a).len >= mid(b).len ? a : b));
  if (ref.includes("south")) return walls.reduce((a, b) => (mid(a).my >= mid(b).my ? a : b));
  if (ref.includes("north")) return walls.reduce((a, b) => (mid(a).my <= mid(b).my ? a : b));
  // nearest to center as fallback
  return walls.reduce((a, b) => {
    const da = Math.hypot(mid(a).mx - cx, mid(a).my - cy);
    const db = Math.hypot(mid(b).mx - cx, mid(b).my - cy);
    return da <= db ? a : b;
  });
}

export function dispatchTool(name: string, args: any, plan: FloorPlan = { walls: [], doors: [], windows: [], rooms: [] }) {
  args = args || {};
  const actions: ClientAction[] = [];
  let message = "";

  switch (name) {
    case "draw_wall": {
      const wall = {
        id: uid("wall"),
        type: "wall",
        x1: +args.x1, y1: +args.y1, x2: +args.x2, y2: +args.y2,
        thickness_mm: +args.thickness_mm || 150,
        height_mm: +args.height_mm || 2700,
        kind: args.kind || "exterior",
        label: args.label,
      };
      actions.push({ type: "add_wall", wall });
      message = `Drew ${wall.kind} wall ${wall.id}`;
      break;
    }
    case "draw_room_rectangle": {
      const w = args.width_mm ?? (args.width_m ? args.width_m * 1000 : 4000);
      const d = args.depth_mm ?? (args.depth_m ? args.depth_m * 1000 : 5000);
      const ox = +args.origin_x || 0;
      const oy = +args.origin_y || 0;
      const t = +args.wall_thickness_mm || 150;
      const name = args.name || "Room";
      // offset so multiple rooms don't stack: if plan has rooms, place to the right
      let offX = ox;
      if (!args.origin_x && plan.rooms?.length) {
        const maxX = Math.max(0, ...plan.walls.map((ww) => Math.max(ww.x1, ww.x2)));
        offX = maxX + 1000;
      }
      const corners: [number, number][] = [[offX, oy], [offX + w, oy], [offX + w, oy + d], [offX, oy + d]];
      const walls = [];
      for (let i = 0; i < 4; i++) {
        const [x1, y1] = corners[i];
        const [x2, y2] = corners[(i + 1) % 4];
        walls.push({ id: uid("wall"), type: "wall", x1, y1, x2, y2, thickness_mm: t, height_mm: 2700, kind: "exterior", label: `${name}-W${i + 1}` });
      }
      const room = { id: uid("room"), name, origin_x: offX, origin_y: oy, width_mm: w, depth_mm: d, wall_ids: walls.map((x) => x.id) };
      walls.forEach((wall) => actions.push({ type: "add_wall", wall }));
      actions.push({ type: "add_room", room });
      // outer dimensions
      actions.push({ type: "add_dimension", dimension: { id: uid("dim"), x1: offX, y1: oy - 400, x2: offX + w, y2: oy - 400, label: `${(w / 1000).toFixed(2)} m` } });
      actions.push({ type: "add_dimension", dimension: { id: uid("dim"), x1: offX - 400, y1: oy, x2: offX - 400, y2: oy + d, label: `${(d / 1000).toFixed(2)} m` } });
      message = `Created room '${name}' ${(w / 1000).toFixed(2)}m × ${(d / 1000).toFixed(2)}m`;
      break;
    }
    case "add_door": {
      const wall = resolveWall(plan, args.wall_id, args.wall_ref);
      const door = {
        id: uid("door"),
        type: "door",
        wall_id: wall?.id,
        position_along_wall: args.position_along_wall ?? 0.5,
        width_mm: +args.width_mm || 900,
        swing: args.swing || "left",
      };
      actions.push({ type: "add_door", door });
      message = `Added door on ${args.wall_ref || wall?.label || wall?.id || "wall"}`;
      break;
    }
    case "add_window": {
      const wall = resolveWall(plan, args.wall_id, args.wall_ref);
      const win = {
        id: uid("win"),
        type: "window",
        wall_id: wall?.id,
        position_along_wall: args.position_along_wall ?? 0.5,
        width_mm: +args.width_mm || 1200,
        sill_height_mm: +args.sill_height_mm || 900,
        height_mm: +args.height_mm || 1200,
      };
      actions.push({ type: "add_window", window: win });
      message = `Added window on ${args.wall_ref || wall?.label || wall?.id || "wall"}`;
      break;
    }
    case "add_interior_wall": {
      const wall = {
        id: uid("iwall"),
        type: "wall",
        x1: +args.x1, y1: +args.y1, x2: +args.x2, y2: +args.y2,
        thickness_mm: +args.thickness_mm || 100,
        height_mm: 2700,
        kind: "interior",
      };
      actions.push({ type: "add_wall", wall });
      actions.push({ type: "add_interior_wall", wall });
      message = `Added interior wall ${wall.id}`;
      break;
    }
    case "add_dimension": {
      const dim = {
        id: uid("dim"),
        x1: +args.x1, y1: +args.y1, x2: +args.x2, y2: +args.y2,
        label: args.label || `${(Math.hypot(+args.x2 - +args.x1, +args.y2 - +args.y1) / 1000).toFixed(2)} m`,
      };
      actions.push({ type: "add_dimension", dimension: dim });
      message = `Added dimension ${dim.label}`;
      break;
    }
    case "build_3d":
      actions.push({ type: "build_3d", wall_height_mm: +args.wall_height_mm || 2700 });
      message = "Building 3D…";
      break;
    case "export_ifc":
      actions.push({ type: "export_ifc" });
      message = "Exporting IFC…";
      break;
    case "export_step":
      actions.push({ type: "export_step" });
      message = "Requesting STEP export…";
      break;
    case "set_mode":
      actions.push({ type: "set_mode", mode: args.mode });
      message = `Mode ${args.mode}`;
      break;
    case "undo":
      actions.push({ type: "undo" });
      message = "Undo";
      break;
    case "clear_plan":
      actions.push({ type: "clear_plan" });
      message = "Cleared";
      break;
    case "speak_status":
      message = `Plan: ${plan.rooms?.length || 0} rooms, ${plan.walls?.length || 0} walls, ${plan.doors?.length || 0} doors, ${plan.windows?.length || 0} windows`;
      break;
    default:
      return { ok: false, message: `Unknown tool ${name}`, client_actions: [] as ClientAction[] };
  }
  return { ok: true, message, client_actions: actions };
}

/** Parse natural language into tool calls when no LLM is available. */
export function heuristicIntent(text: string, plan: FloorPlan) {
  const t = text.toLowerCase().trim();
  if (t.includes("clear")) return dispatchTool("clear_plan", {}, plan);
  if (t.includes("undo")) return dispatchTool("undo", {}, plan);
  if (t.includes("status") || t.includes("how many")) return dispatchTool("speak_status", {}, plan);
  if (t.includes("ifc")) return dispatchTool("export_ifc", {}, plan);
  if (t.includes("step")) return dispatchTool("export_step", {}, plan);
  if (t.includes("build") || t.includes("3d")) return dispatchTool("build_3d", {}, plan);
  if (t.includes("freehand")) return dispatchTool("set_mode", { mode: "freehand" }, plan);
  if (t.includes("architecture") || t.includes("floor plan")) return dispatchTool("set_mode", { mode: "architecture" }, plan);

  // multi-room: "living room 5 by 6 and kitchen 3 by 4"
  const roomRe = /(?:a\s+)?(\d+(?:\.\d+)?)\s*(?:by|x|×)\s*(\d+(?:\.\d+)?)\s*(?:m|meter|metre)?(?:\s+)?([a-z]+)?/gi;
  const rooms: { w: number; d: number; name?: string }[] = [];
  // "bedroom 4 by 5" or "4 by 5 meter bedroom"
  const named = t.match(/([a-z]+)\s+(\d+(?:\.\d+)?)\s*(?:by|x|×)\s*(\d+(?:\.\d+)?)/i);
  if (named && !/draw|add|put/.test(named[1])) {
    rooms.push({ name: named[1], w: parseFloat(named[2]) * 1000, d: parseFloat(named[3]) * 1000 });
  }
  let m: RegExpExecArray | null;
  const re = /(\d+(?:\.\d+)?)\s*(?:by|x|×)\s*(\d+(?:\.\d+)?)/g;
  while ((m = re.exec(t))) {
    rooms.push({ w: parseFloat(m[1]) * 1000, d: parseFloat(m[2]) * 1000 });
  }
  if ((t.includes("room") || t.includes("bedroom") || t.includes("kitchen") || t.includes("living")) && rooms.length) {
    // If name in text
    let name = "Room";
    if (t.includes("bedroom")) name = "Bedroom";
    else if (t.includes("kitchen")) name = "Kitchen";
    else if (t.includes("living")) name = "Living";
    else if (t.includes("bath")) name = "Bath";
    const r0 = rooms[0];
    return dispatchTool("draw_room_rectangle", { width_mm: r0.w, depth_mm: r0.d, name: r0.name || name }, plan);
  }

  // door on south / middle of longest
  if (t.includes("door")) {
    let wall_ref = "longest";
    if (t.includes("south")) wall_ref = "south";
    else if (t.includes("north")) wall_ref = "north";
    else if (t.includes("east")) wall_ref = "east";
    else if (t.includes("west")) wall_ref = "west";
    else if (t.includes("long")) wall_ref = "longest";
    const pos = t.includes("middle") || t.includes("center") || t.includes("centre") ? 0.5 : 0.3;
    return dispatchTool("add_door", { wall_ref, position_along_wall: pos }, plan);
  }
  if (t.includes("window")) {
    let wall_ref = "longest";
    if (t.includes("south")) wall_ref = "south";
    else if (t.includes("north")) wall_ref = "north";
    else if (t.includes("east")) wall_ref = "east";
    else if (t.includes("west")) wall_ref = "west";
    return dispatchTool("add_window", { wall_ref, position_along_wall: 0.5 }, plan);
  }
  if (t.includes("interior") || t.includes("partition")) {
    // simple center partition if room exists
    const room = plan.rooms?.[0];
    if (room) {
      const x = room.origin_x + room.width_mm / 2;
      return dispatchTool("add_interior_wall", { x1: x, y1: room.origin_y, x2: x, y2: room.origin_y + room.depth_mm, thickness_mm: 100 }, plan);
    }
  }

  return {
    ok: true,
    message: `Heard: "${text}". Try: "draw a 4 by 5 meter bedroom", "add a door on the south wall", "window middle of longest wall", "build 3d", "export ifc".`,
    client_actions: [] as ClientAction[],
  };
}

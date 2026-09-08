import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    plan: {
      walls: [
        { id: "w1", type: "wall", x1: 0, y1: 0, x2: 4000, y2: 0, thickness_mm: 150, height_mm: 2700, label: "South" },
        { id: "w2", type: "wall", x1: 4000, y1: 0, x2: 4000, y2: 5000, thickness_mm: 150, height_mm: 2700, label: "East" },
        { id: "w3", type: "wall", x1: 4000, y1: 5000, x2: 0, y2: 5000, thickness_mm: 150, height_mm: 2700, label: "North" },
        { id: "w4", type: "wall", x1: 0, y1: 5000, x2: 0, y2: 0, thickness_mm: 150, height_mm: 2700, label: "West" },
      ],
      doors: [{ id: "d1", type: "door", wall_id: "w1", position_along_wall: 0.3, width_mm: 900, swing: "left" }],
      windows: [{ id: "win1", type: "window", wall_id: "w3", position_along_wall: 0.5, width_mm: 1500, sill_height_mm: 900, height_mm: 1200 }],
      rooms: [{ id: "r1", name: "Bedroom", origin_x: 0, origin_y: 0, width_mm: 4000, depth_mm: 5000, wall_ids: ["w1", "w2", "w3", "w4"] }],
    },
  });
}

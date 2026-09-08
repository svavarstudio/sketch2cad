"""Sketch2CAD CAD worker — CadQuery STEP/STL export for floor plans."""
from __future__ import annotations
import math, uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

try:
    import cadquery as cq
    HAS_CQ = True
except ImportError:
    HAS_CQ = False

STATIC = Path(__file__).parent / "static"
STATIC.mkdir(exist_ok=True)

app = FastAPI(title="Sketch2CAD CAD Worker", version="0.5.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")


class PlanBuild(BaseModel):
    plan: Dict[str, Any]
    wall_height_mm: float = 2700


def wall_poly(x1, y1, x2, y2, t):
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / length, dx / length
    hx, hy = nx * t / 2, ny * t / 2
    return [(x1 + hx, y1 + hy), (x2 + hx, y2 + hy), (x2 - hx, y2 - hy), (x1 - hx, y1 - hy)]


@app.get("/health")
def health():
    return {"status": "ok", "cadquery": HAS_CQ}


@app.post("/api/plan/build")
def build(req: PlanBuild):
    job = str(uuid.uuid4())
    walls = req.plan.get("walls") or []
    if not walls:
        return {"success": False, "error": "no walls"}
    if not HAS_CQ:
        return {"success": False, "error": "cadquery not installed", "job_id": job}

    solid = None
    for w in walls:
        t = float(w.get("thickness_mm", 150))
        h = float(w.get("height_mm", req.wall_height_mm))
        poly = wall_poly(w["x1"], w["y1"], w["x2"], w["y2"], t)
        part = cq.Workplane("XY").polyline(poly).close().extrude(h)
        solid = part if solid is None else solid.union(part)

    step = STATIC / f"{job}.step"
    stl = STATIC / f"{job}.stl"
    cq.exporters.export(solid, str(step))
    cq.exporters.export(solid, str(stl))
    return {
        "success": True,
        "job_id": job,
        "step_url": f"/static/{job}.step",
        "stl_url": f"/static/{job}.stl",
        "message": f"Exported {len(walls)} walls",
    }

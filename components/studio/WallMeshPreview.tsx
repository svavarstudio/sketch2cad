"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";

type Wall = {
  x1: number; y1: number; x2: number; y2: number;
  thickness_mm?: number; height_mm?: number; kind?: string;
};

/**
 * True wall-mesh 3D preview: extrudes each wall as a box along its centerline.
 * Units: plan mm → scene meters (/1000).
 */
export default function WallMeshPreview({ walls }: { walls: Wall[] }) {
  const mount = useRef<HTMLDivElement>(null);

  const geomKey = useMemo(
    () => walls.map((w) => `${w.x1},${w.y1},${w.x2},${w.y2},${w.thickness_mm},${w.height_mm}`).join("|"),
    [walls]
  );

  useEffect(() => {
    if (!mount.current) return;
    const el = mount.current;
    const w = el.clientWidth || 400;
    const h = el.clientHeight || 300;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
    camera.position.set(12, 12, 12);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.innerHTML = "";
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 15, 8);
    scene.add(dir);
    scene.add(new THREE.GridHelper(40, 40, 0x334155, 0x1e293b));

    const group = new THREE.Group();
    // center plan
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const wall of walls) {
      minX = Math.min(minX, wall.x1, wall.x2);
      minY = Math.min(minY, wall.y1, wall.y2);
      maxX = Math.max(maxX, wall.x1, wall.x2);
      maxY = Math.max(maxY, wall.y1, wall.y2);
    }
    if (!isFinite(minX)) {
      minX = minY = 0;
      maxX = maxY = 1;
    }
    const cx = (minX + maxX) / 2 / 1000;
    const cy = (minY + maxY) / 2 / 1000;

    for (const wall of walls) {
      const x1 = wall.x1 / 1000, y1 = wall.y1 / 1000, x2 = wall.x2 / 1000, y2 = wall.y2 / 1000;
      const len = Math.hypot(x2 - x1, y2 - y1) || 0.01;
      const thick = (wall.thickness_mm || 150) / 1000;
      const height = (wall.height_mm || 2700) / 1000;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(len, height, thick),
        new THREE.MeshStandardMaterial({
          color: wall.kind === "interior" ? 0x94a3b8 : 0xe2e8f0,
          roughness: 0.7,
          metalness: 0.05,
        })
      );
      mesh.position.set((x1 + x2) / 2 - cx, height / 2, (y1 + y2) / 2 - cy);
      mesh.rotation.y = -angle;
      group.add(mesh);
    }
    scene.add(group);

    let frame = 0;
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      frame++;
      group.rotation.y = Math.sin(frame * 0.005) * 0.35;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const ww = el.clientWidth || 400;
      const hh = el.clientHeight || 300;
      camera.aspect = ww / hh;
      camera.updateProjectionMatrix();
      renderer.setSize(ww, hh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      el.innerHTML = "";
    };
  }, [geomKey, walls]);

  return <div ref={mount} style={{ width: "100%", height: "100%", minHeight: 220 }} />;
}

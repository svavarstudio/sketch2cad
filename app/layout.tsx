import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sketch2CAD — Sketch & floor plans to parametric 3D",
  description:
    "Draw freehand or architectural floor plans, speak to create walls/doors/windows, export CadQuery + STEP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

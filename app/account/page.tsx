"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    const e = localStorage.getItem("s2c_email") || "";
    setEmail(e);
  }, []);
  useEffect(() => {
    if (!email) return;
    fetch(`/api/entitlements?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then(setData);
  }, [email]);
  return (
    <>
      <Nav />
      <main className="container" style={{ paddingTop: 40 }}>
        <h1>Account</h1>
        <p className="muted">Entitlements follow Stripe Checkout email (test mode).</p>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => localStorage.setItem("s2c_email", email)}
          placeholder="you@email.com"
          style={{ padding: 10, borderRadius: 8, border: "1px solid #1f2937", background: "#111827", color: "#fff", width: 280 }}
        />
        {data && (
          <div className="card" style={{ marginTop: 16 }}>
            <div>Plan: <strong>{data.planId}</strong> ({data.status})</div>
            <ul>{(data.features || []).map((f: string) => <li key={f}>{f}</li>)}</ul>
          </div>
        )}
        <p style={{ marginTop: 24 }}><Link href="/pricing">Upgrade →</Link></p>
      </main>
    </>
  );
}

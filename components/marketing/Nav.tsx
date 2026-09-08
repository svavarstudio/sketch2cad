import Link from "next/link";

export function Nav() {
  return (
    <div className="container">
      <nav className="nav">
        <Link href="/" className="logo">
          Sketch2CAD
        </Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/studio">Studio</Link>
        <div style={{ flex: 1 }} />
        <Link href="/studio" className="btn btn-primary">
          Open studio
        </Link>
      </nav>
    </div>
  );
}

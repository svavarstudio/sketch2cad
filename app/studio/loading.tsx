export default function Loading() {
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center", background: "#0a0f1a" }}>
      <div className="skeleton" style={{ width: 280, height: 24 }} />
    </div>
  );
}

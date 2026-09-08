export default function Loading() {
  return (
    <div className="container" style={{ paddingTop: 48 }}>
      <div className="skeleton" style={{ height: 40, width: 220, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 280 }} />
    </div>
  );
}

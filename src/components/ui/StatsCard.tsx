type StatsCardProps = {
  label: string;
  value: number | string;
  icon?: string;
  sub?: string;
  accent?: boolean;
};

export default function StatsCard({ label, value, icon, sub, accent }: StatsCardProps) {
  return (
    <div style={{
      background: accent ? "var(--primary)" : "var(--white)",
      borderRadius: "var(--radius-md)",
      padding: "20px 24px",
      boxShadow: "var(--shadow-sm)",
      border: accent ? "none" : "1px solid var(--neutral-dark)",
      flex: 1,
    }}>
      {icon && <div style={{ fontSize: "20px", marginBottom: "8px" }}>{icon}</div>}
      <div style={{
        fontSize: "32px",
        fontWeight: 700,
        color: accent ? "var(--white)" : "var(--text-primary)",
        lineHeight: 1,
        marginBottom: "4px",
      }}>{value}</div>
      <div style={{
        fontSize: "13px",
        color: accent ? "rgba(255,255,255,0.8)" : "var(--text-secondary)",
        fontWeight: 500,
      }}>{label}</div>
      {sub && <div style={{
        fontSize: "12px",
        color: accent ? "rgba(255,255,255,0.6)" : "var(--text-muted)",
        marginTop: "4px",
      }}>{sub}</div>}
    </div>
  );
}
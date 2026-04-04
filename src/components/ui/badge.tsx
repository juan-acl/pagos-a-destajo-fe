type BadgeProps = {
  label: string;
  color?: "green" | "amber" | "red" | "blue" | "gray";
};

const colors = {
  green:  { bg: "#F0FFF4", color: "#2D6A4F", border: "#52B788" },
  amber:  { bg: "#FFFDF0", color: "#92600A", border: "#E9C46A" },
  red:    { bg: "#FFF0F0", color: "#991B1B", border: "#FCA5A5" },
  blue:   { bg: "#EFF6FF", color: "#1E40AF", border: "#93C5FD" },
  gray:   { bg: "#F8F9FA", color: "#6C757D", border: "#DEE2E6" },
};

export default function Badge({ label, color = "gray" }: BadgeProps) {
  const c = colors[color];
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      borderRadius: "999px",
      padding: "3px 10px",
      fontSize: "12px",
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}
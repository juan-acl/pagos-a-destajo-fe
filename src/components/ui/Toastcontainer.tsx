import type { Toast } from "@/hooks/useToast";

const ICONS: Record<string, string> = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
};

const COLORS: Record<string, string> = {
  success: "#2D6A4F",
  error: "#DC3545",
  warning: "#E9C46A",
  info: "#3B82F6",
};

const BG: Record<string, string> = {
  success: "#EAF4EE",
  error: "#FEF2F2",
  warning: "#FFFBEB",
  info: "#EFF6FF",
};

type Props = {
  toasts: Toast[];
  onRemove: (id: number) => void;
};

export default function ToastContainer({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "72px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "380px",
        width: "100%",
      }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            background: BG[t.type],
            border: `1.5px solid ${COLORS[t.type]}30`,
            borderLeft: `4px solid ${COLORS[t.type]}`,
            borderRadius: "10px",
            padding: "12px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            animation: "slideIn 0.2s ease",
          }}
        >
          <span style={{ fontSize: "16px", lineHeight: 1.4, flexShrink: 0 }}>
            {ICONS[t.type]}
          </span>
          <p style={{
            margin: 0, flex: 1,
            fontSize: "13px", lineHeight: 1.5,
            color: "#1A202C", fontFamily: "inherit",
          }}>
            {t.message}
          </p>
          <button
            onClick={() => onRemove(t.id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#9CA3AF", fontSize: "16px", lineHeight: 1,
              padding: "0", flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
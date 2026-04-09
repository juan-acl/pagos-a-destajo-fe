import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
};

export default function Modal({ open, title, subtitle, onClose, children, width = 560 }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "24px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--white)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          width: "100%", maxWidth: width,
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        <div style={{
          padding: "24px 28px 20px",
          borderBottom: "1px solid var(--neutral-dark)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>{title}</h2>
            {subtitle && <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: "20px",
            cursor: "pointer", color: "var(--text-muted)", lineHeight: 1, padding: "0 4px",
          }}>×</button>
        </div>
        <div style={{ padding: "24px 28px" }}>{children}</div>
      </div>
    </div>
  );
}
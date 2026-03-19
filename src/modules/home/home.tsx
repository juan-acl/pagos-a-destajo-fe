import { useNavigate } from "react-router-dom";

type Modulo = {
    titulo: string;
    descripcion: string;
    ruta: string;
    emoji: string;
    color: string;
};

const modulos: Modulo[] = [
    {
        titulo: "Puestos",
        descripcion: "Gestión de puestos de trabajo",
        ruta: "/position",
        emoji: "🏷️",
        color: "#7c3aed",
    },
    {
        titulo: "Empleados",
        descripcion: "Gestión de empleados del sistema",
        ruta: "/empleados",
        emoji: "👷",
        color: "#2563eb",
    },
    {
        titulo: "Áreas y Cuadrillas",
        descripcion: "Gestión de cuadrillas de trabajo",
        ruta: "/cuadrillas",
        emoji: "👥",
        color: "#0891b2",
    },
    {
        titulo: "Miembros de Cuadrilla",
        descripcion: "Asignación de empleados a cuadrillas",
        ruta: "/miembros-cuadrilla",
        emoji: "🔗",
        color: "#059669",
    },
    {
        titulo: "Medidas",
        descripcion: "Gestión de unidades de medida",
        ruta: "/medidas",
        emoji: "📏",
        color: "#d97706",
    },
    {
        titulo: "Órdenes de Trabajo",
        descripcion: "Creación y seguimiento de órdenes",
        ruta: "/ordenes-trabajo",
        emoji: "📋",
        color: "#dc2626",
    },
    {
        titulo: "Asignación Orden-Cuadrilla",
        descripcion: "Asignación de órdenes a cuadrillas",
        ruta: "/asignaciones-orden-cuadrilla",
        emoji: "📌",
        color: "#7c3aed",
    },
];

export default function Home() {
    const navigate = useNavigate();

    return (
        <div style={s.page}>
            <div style={s.hero}>
                <h1 style={s.heroTitle}>🏭 Sistema de Pago a Destajo</h1>
                <p style={s.heroSub}>Selecciona un módulo para comenzar</p>
            </div>

            <div style={s.grid}>
                {modulos.map(m => (
                    <div
                        key={m.ruta}
                        style={s.card}
                        onClick={() => navigate(m.ruta)}
                        onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                    >
                        <div style={{ ...s.iconBox, background: m.color }}>
                            <span style={s.emoji}>{m.emoji}</span>
                        </div>
                        <div style={s.cardBody}>
                            <h2 style={s.cardTitle}>{m.titulo}</h2>
                            <p style={s.cardDesc}>{m.descripcion}</p>
                        </div>
                        <div style={{ ...s.arrow, color: m.color }}>→</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: { padding: "40px 24px", maxWidth: "1100px", margin: "0 auto" },
    hero: { textAlign: "center", marginBottom: "40px" },
    heroTitle: { fontSize: "28px", fontWeight: 700, margin: 0, marginBottom: "8px" },
    heroSub: { fontSize: "15px", color: "#64748b", margin: 0 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" },
    card: {
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        padding: "20px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
    },
    iconBox: { borderRadius: "10px", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    emoji: { fontSize: "22px" },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: "15px", fontWeight: 600, margin: 0, marginBottom: "4px", color: "#0f172a" },
    cardDesc: { fontSize: "13px", color: "#64748b", margin: 0 },
    arrow: { fontSize: "20px", fontWeight: 600, flexShrink: 0 },
};

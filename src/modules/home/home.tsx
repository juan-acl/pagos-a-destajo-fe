import { Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { crudStyles as s } from "@/styles/crudStyles";

const cards = [
  {
    title: "Asignación de empleado",
    description: "Administra la meta individual, el estado y la cuadrilla asignada para cada empleado.",
    to: "/employee-assignment",
  },
  {
    title: "Revisión de producción",
    description: "Registra cantidades recibidas, aprobadas, observaciones y la asignación vinculada.",
    to: "/production-review",
  },
  {
    title: "Lote de producción",
    description: "Gestiona lotes enviados, piezas aprobadas y la revisión de producción relacionada.",
    to: "/production-lot",
  },
];

export default function Home() {
  return (
    <AppShell>
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.titleGroup}>
            <h1 style={s.title}>Pagos a destajo</h1>
            <p style={s.description}>
              Frontend base construido sobre la estructura del proyecto de referencia, listo para consumir el backend en Oracle.
            </p>
          </div>
        </div>

        <div style={s.statGrid}>
          {cards.map((card) => (
            <div key={card.to} style={s.statCard}>
              <div style={s.statLabel}>{card.title}</div>
              <p style={{ ...s.description, marginBottom: "14px" }}>{card.description}</p>
              <Link to={card.to} style={{ ...s.navLink, ...s.navLinkActive }}>
                Abrir módulo
              </Link>
            </div>
          ))}
        </div>

        <div style={s.card}>
          <h2 style={s.subtitle}>Módulos integrados</h2>
          <p style={s.description}>
            Esta base deja listas las pantallas CRUD para asignaciones, revisiones y lotes de producción, manteniendo el mismo patrón visual de tarjetas, formularios y tablas.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

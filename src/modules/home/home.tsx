import { Link } from "react-router-dom";
import { crudStyles as s } from "@/styles/crudStyles";

const cards = [
  {
    title: "Asignación de empleado",
    description:
      "Administra la meta individual, el estado y la cuadrilla asignada para cada empleado.",
    to: "/employee-assignment",
  },
  {
    title: "Revisión de producción",
    description:
      "Registra cantidades recibidas, aprobadas, observaciones y la asignación vinculada.",
    to: "/production-review",
  },
  {
    title: "Lote de producción",
    description:
      "Gestiona lotes enviados, piezas aprobadas y la revisión de producción relacionada.",
    to: "/production-lot",
  },
  {
    title: "Planilla de pago",
    description:
      "Gestiona planillas de pago, con base a los lotes de producción.",
    to: "/planillas",
  },
  {
    title: "Puesto de trabajo",
    description: "Gestiona puestos de trabajo que tiene un empleado.",
    to: "/puestos",
  },
  {
    title: "Area de trabajo",
    description: "Gestiona areas de trabajo.",
    to: "/areas",
  },
  {
    title: "Cuadrilla",
    description: "Gestiona cuadrillas de trabajo.",
    to: "/cuadrillas",
  },
  {
    title: "Empleado",
    description: "Gestiona empleados, con sus datos personales y laborales.",
    to: "/empleados",
  },
  {
    title: "Miembro de cuadrilla",
    description:
      "Gestiona miembros de cuadrilla, con su rol y fecha de ingreso.",
    to: "/miembros-cuadrilla",
  },
  {
    title: "Unidad de medida",
    description: "Gestiona unidades de medida para las cantidades producidas.",
    to: "/medidas",
  },
  {
    title: "Orden de trabajo",
    description:
      "Gestiona órdenes de trabajo, con su descripción, cantidad requerida y unidad de medida.",
    to: "/ordenes-trabajo",
  },
  {
    title: "Asignación de orden a cuadrilla",
    description:
      "Gestiona asignaciones de órdenes a cuadrillas, con fecha y estado.",
    to: "/asignaciones-orden-cuadrilla",
  },
];

export default function Home() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.titleGroup}>
          <h1 style={s.title}>Pagos a destajo</h1>
        </div>
      </div>

      <div style={s.statGrid}>
        {cards.map((card) => (
          <div key={card.to} style={s.statCard}>
            <div style={s.statLabel}>{card.title}</div>
            <p style={{ ...s.description, marginBottom: "14px" }}>
              {card.description}
            </p>
            <Link to={card.to} style={{ ...s.navLink, ...s.navLinkActive }}>
              Abrir módulo
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

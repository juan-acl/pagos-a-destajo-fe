import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { crudStyles as s } from "@/styles/crudStyles";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/empleados", label: "Empleados" },
  { to: "/cuadrillas", label: "Cuadrillas" },
  { to: "/miembros-cuadrilla", label: "Miembros" },
  { to: "/position", label: "Puestos" },
  { to: "/employee-assignment", label: "Asignaciones" },
  { to: "/production-review", label: "Revisiones" },
  { to: "/production-lot", label: "Lotes" },
];

export default function AppShell({ children }: PropsWithChildren) {
  return (
    <div style={s.shell}>
      <nav style={s.nav}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              ...s.navLink,
              ...(isActive ? s.navLinkActive : {}),
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div style={s.shellInner}>{children}</div>
    </div>
  );
}

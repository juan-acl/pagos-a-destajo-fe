import AppShell from "@/components/layout/AppShell";
import { crudStyles as s } from "@/styles/crudStyles";

export default function PositionWorker() {
  return (
    <AppShell>
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.titleGroup}>
            <h1 style={s.title}>Puestos de trabajo</h1>
            <p style={s.description}>
              Módulo base del proyecto. Puedes usar esta misma plantilla para continuar integrando más catálogos.
            </p>
          </div>
        </div>
        <div style={s.card}>
          <p style={s.description}>
            La estructura del frontend ya quedó lista con React Query, Axios, navegación por rutas y el mismo patrón visual de formularios y tablas.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

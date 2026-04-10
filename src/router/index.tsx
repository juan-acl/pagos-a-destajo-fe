import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import Home from "@/modules/home/home";

const Empleado = lazy(() => import("@/modules/empleado/empleado"));
const Cuadrilla = lazy(() => import("@/modules/cuadrilla/cuadrilla"));
const MiembroCuadrilla = lazy(
  () => import("@/modules/miembroCuadrilla/miembroCuadrilla"),
);
const Medidas = lazy(() => import("@/modules/medidas/medidas"));
const OrdenTrabajo = lazy(() => import("@/modules/ordenTrabajo/ordenTrabajo"));
const AsignacionOrdenCuadrilla = lazy(
  () => import("@/modules/asignacionOrdenCuadrilla/asignacionOrdenCuadrilla"),
);
const EmployeeAssignment = lazy(
  () => import("@/modules/employeeAssignment/employeeAssignment"),
);
const ProductionReview = lazy(
  () => import("@/modules/productionReview/productionReview"),
);
const RevisionDestajo = lazy(
  () => import("@/modules/revisionDestajo/revisionDestajo"),
);
const ProductionLot = lazy(
  () => import("@/modules/productionLot/productionLot"),
);
const Area = lazy(() => import("@/modules/area/area"));
const Planilla = lazy(() => import("@/modules/planilla/planilla"));
const Puesto = lazy(() => import("@/modules/puesto/puesto"));

export default function Router() {
  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<div style={{ padding: "24px" }}>Cargando...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/empleados" element={<Empleado />} />
            <Route path="/cuadrillas" element={<Cuadrilla />} />
            <Route path="/miembros-cuadrilla" element={<MiembroCuadrilla />} />
            <Route path="/medidas" element={<Medidas />} />
            <Route path="/ordenes-trabajo" element={<OrdenTrabajo />} />
            <Route
              path="/asignaciones-orden-cuadrilla"
              element={<AsignacionOrdenCuadrilla />}
            />
            <Route
              path="/employee-assignment"
              element={<EmployeeAssignment />}
            />
            <Route path="/production-review" element={<ProductionReview />} />
            <Route path="/revision-destajo" element={<RevisionDestajo />} />
            <Route path="/production-lot" element={<ProductionLot />} />
            <Route path="/areas" element={<Area />} />
            <Route path="/planillas" element={<Planilla />} />
            <Route path="/puestos" element={<Puesto />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}

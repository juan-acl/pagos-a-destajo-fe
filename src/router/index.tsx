import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

const PositionWorker = lazy(() => import("@/modules/positionWorker/positionWorker"));
const Empleado = lazy(() => import("@/modules/empleado/empleado"));
const Cuadrilla = lazy(() => import("@/modules/cuadrilla/cuadrilla"));
const MiembroCuadrilla = lazy(() => import("@/modules/miembroCuadrilla/miembroCuadrilla"));
const Medidas = lazy(() => import("@/modules/medidas/medidas"));
const OrdenTrabajo = lazy(() => import("@/modules/ordenTrabajo/ordenTrabajo"));
const AsignacionOrdenCuadrilla = lazy(() => import("@/modules/asignacionOrdenCuadrilla/asignacionOrdenCuadrilla"));
const EmployeeAssignment = lazy(() => import("@/modules/employeeAssignment/employeeAssignment"));
const ProductionReview = lazy(() => import("@/modules/productionReview/productionReview"));
const ProductionLot = lazy(() => import("@/modules/productionLot/productionLot"));

export default function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: "24px" }}>Cargando...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/medidas" replace />} />
          <Route path="/position" element={<PositionWorker />} />
          <Route path="/empleados" element={<Empleado />} />
          <Route path="/cuadrillas" element={<Cuadrilla />} />
          <Route path="/miembros-cuadrilla" element={<MiembroCuadrilla />} />
          <Route path="/medidas" element={<Medidas />} />
          <Route path="/ordenes-trabajo" element={<OrdenTrabajo />} />
          <Route path="/asignaciones-orden-cuadrilla" element={<AsignacionOrdenCuadrilla />} />
          <Route path="/employee-assignment" element={<EmployeeAssignment />} />
          <Route path="/production-review" element={<ProductionReview />} />
          <Route path="/production-lot" element={<ProductionLot />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

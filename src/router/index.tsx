import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const PositionWorker = lazy(() => import("@/modules/positionWorker/positionWorker"));
const Empleado = lazy(() => import("@/modules/empleado/empleado"));
const Cuadrilla = lazy(() => import("@/modules/cuadrilla/cuadrilla"));
const MiembroCuadrilla = lazy(() => import("@/modules/miembroCuadrilla/miembroCuadrilla"));
const Area = lazy(() => import("@/modules/area/area"));
const Planilla = lazy(() => import("@/modules/planilla/planilla"));
const Puesto = lazy(() => import("@/modules/puesto/puesto"));

export default function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: "24px" }}>Cargando...</div>}>
        <Routes>
          <Route path="/position" element={<PositionWorker />} />
          <Route path="/empleados" element={<Empleado />} />
          <Route path="/cuadrillas" element={<Cuadrilla />} />
          <Route path="/miembros-cuadrilla" element={<MiembroCuadrilla />} />
          <Route path="/areas" element={<Area />} />
          <Route path="/planillas" element={<Planilla />} />
          <Route path="/puestos" element={<Puesto />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
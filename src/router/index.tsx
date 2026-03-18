import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const PositionWorker = lazy(() => import("@/modules/positionWorker/positionWorker"));
const Empleado = lazy(() => import("@/modules/empleado/empleado"));
const Cuadrilla = lazy(() => import("@/modules/cuadrilla/cuadrilla"));
const MiembroCuadrilla = lazy(() => import("@/modules/miembroCuadrilla/miembroCuadrilla"));

export default function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: "24px" }}>Cargando...</div>}>
        <Routes>
          <Route path="/position" element={<PositionWorker />} />
          <Route path="/empleados" element={<Empleado />} />
          <Route path="/cuadrillas" element={<Cuadrilla />} />
          <Route path="/miembros-cuadrilla" element={<MiembroCuadrilla />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import Home from "@/modules/home/home";
import Login from "@/modules/login/login";
import { useAuthStore, canAccessBackoffice } from "@/store/authStore";

const Empleado = lazy(() => import("@/modules/empleado/empleado"));
const Cuadrilla = lazy(() => import("@/modules/cuadrilla/cuadrilla"));
const MiembroCuadrilla = lazy(() => import("@/modules/miembroCuadrilla/miembroCuadrilla"));
const Medidas = lazy(() => import("@/modules/medidas/medidas"));
const OrdenTrabajo = lazy(() => import("@/modules/ordenTrabajo/ordenTrabajo"));
const AsignacionOrdenCuadrilla = lazy(() => import("@/modules/asignacionOrdenCuadrilla/asignacionOrdenCuadrilla"));
const EmployeeAssignment = lazy(() => import("@/modules/employeeAssignment/employeeAssignment"));
const ProductionReview = lazy(() => import("@/modules/productionReview/productionReview"));
const ProductionLot = lazy(() => import("@/modules/productionLot/productionLot"));
const Area = lazy(() => import("@/modules/area/area"));
const Planilla = lazy(() => import("@/modules/planilla/planilla"));
const Puesto = lazy(() => import("@/modules/puesto/puesto"));
const PanelOperario = lazy(() => import("@/modules/panelOperario/panelOperario"));
const RegistroDiarioPage = lazy(() => import("@/modules/registroDiario/registroDiario"));
const Dashboard = lazy(() => import("@/modules/dashboard/Dashboard.tsx"));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { empleado } = useAuthStore();
  return canAccessBackoffice(empleado) ? <>{children}</> : <Navigate to="/mi-panel" replace />;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <AppShell>
                <Suspense fallback={<div className="p-6 text-gray-400 text-sm">Cargando...</div>}>
                  <Routes>
                    <Route path="/" element={<AdminRoute><Home /></AdminRoute>} />
                    <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
                    <Route path="/empleados" element={<AdminRoute><Empleado /></AdminRoute>} />
                    <Route path="/cuadrillas" element={<AdminRoute><Cuadrilla /></AdminRoute>} />
                    <Route path="/miembros-cuadrilla" element={<AdminRoute><MiembroCuadrilla /></AdminRoute>} />
                    <Route path="/medidas" element={<AdminRoute><Medidas /></AdminRoute>} />
                    <Route path="/ordenes-trabajo" element={<AdminRoute><OrdenTrabajo /></AdminRoute>} />
                    <Route path="/asignaciones-orden-cuadrilla" element={<AdminRoute><AsignacionOrdenCuadrilla /></AdminRoute>} />
                    <Route path="/employee-assignment" element={<AdminRoute><EmployeeAssignment /></AdminRoute>} />
                    <Route path="/production-review" element={<AdminRoute><ProductionReview /></AdminRoute>} />
                    <Route path="/production-lot" element={<AdminRoute><ProductionLot /></AdminRoute>} />
                    <Route path="/areas" element={<AdminRoute><Area /></AdminRoute>} />
                    <Route path="/planillas" element={<AdminRoute><Planilla /></AdminRoute>} />
                    <Route path="/puestos" element={<AdminRoute><Puesto /></AdminRoute>} />
                    <Route path="/registro-diario" element={<AdminRoute><RegistroDiario /></AdminRoute>} />
                    <Route path="/mi-panel" element={<PanelOperario />} />
                  </Routes>
                </Suspense>
              </AppShell>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
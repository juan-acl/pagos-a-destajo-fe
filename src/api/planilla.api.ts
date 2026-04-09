import api from ".";
import type {
  DetallePlanillaResponse,
  EvidenciaPago,
  GenerarResponse,
  OrdenTrabajo,
  Planilla,
  PreviewPlanilla,
} from "@/types/planilla.types";

export const fetchPlanillas = () =>
  api.get<{ data: Planilla[] }>("/planilla").then((r) => r.data.data);

export const fetchPlanillasPendientes = () =>
  api
    .get<{ data: Planilla[] }>("/planilla/pendientes")
    .then((r) => r.data.data);

export const fetchPreviewByOrden = (ordenId: number) =>
  api
    .get<{ data: PreviewPlanilla }>(`/planilla/preview/orden/${ordenId}`)
    .then((r) => r.data.data);

export const generarPlanillaByOrden = (ordenId: number) =>
  api
    .post<{ data: GenerarResponse }>(`/planilla/generar/orden/${ordenId}`)
    .then((r) => r.data.data);

export const ejecutarPago = (id: number, evidencia: EvidenciaPago) =>
  api.post(`/planilla/${id}/ejecutar`, evidencia).then((r) => r.data);

export const rechazarPlanilla = (id: number, observaciones: string) =>
  api
    .post(`/planilla/${id}/rechazar`, { observaciones })
    .then((r) => r.data);

export const fetchOrdenesDisponibles = () =>
  api
    .get<{ data: OrdenTrabajo[] }>("/planilla/ordenes-disponibles")
    .then((r) => r.data.data);

export const fetchDetallePlanilla = (id: number) =>
  api
    .get<{ data: DetallePlanillaResponse }>(`/planilla/${id}/detalle`)
    .then((r) => r.data.data);

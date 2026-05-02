import api from ".";
import type {
  DetallePlanillaResponse,
  EvidenciaPago,
  GenerarResponse,
  OrdenTrabajo,
  Planilla,
  PreviewPlanillaUnion,
  RegistroDiario,
} from "@/types/planilla.types";

export const fetchPlanillas = () =>
  api.get<{ data: Planilla[] }>("/planilla").then((r) => r.data.data);

export const fetchPlanillasPendientes = () =>
  api.get<{ data: Planilla[] }>("/planilla/pendientes").then((r) => r.data.data);

/** Preview DESTAJO: solo ordenId. Preview PAGO_POR_DIAS: también fechaInicio + fechaFin */
export const fetchPreviewByOrden = (
  ordenId: number,
  fechaInicio?: string,
  fechaFin?: string,
) =>
  api
    .get<{ data: PreviewPlanillaUnion }>(`/planilla/preview/orden/${ordenId}`, {
      params: fechaInicio && fechaFin ? { fechaInicio, fechaFin } : undefined,
    })
    .then((r) => r.data.data);

/** Generar planilla; para PAGO_POR_DIAS enviar fechaInicio + fechaFin en body */
export const generarPlanillaByOrden = (
  ordenId: number,
  payload?: { fechaInicio: string; fechaFin: string },
) =>
  api
    .post<{ data: GenerarResponse }>(
      `/planilla/generar/orden/${ordenId}`,
      payload ?? {},
    )
    .then((r) => r.data.data);

export const ejecutarPago = (id: number, evidencia: EvidenciaPago) =>
  api.post(`/planilla/${id}/ejecutar`, evidencia).then((r) => r.data);

export const rechazarPlanilla = (id: number, observaciones: string) =>
  api.post(`/planilla/${id}/rechazar`, { observaciones }).then((r) => r.data);

export const fetchOrdenesDisponibles = () =>
  api
    .get<{ data: OrdenTrabajo[] }>("/planilla/ordenes-disponibles")
    .then((r) => r.data.data);

export const fetchDetallePlanilla = (id: number) =>
  api
    .get<{ data: DetallePlanillaResponse }>(`/planilla/${id}/detalle`)
    .then((r) => r.data.data);

// ── Registros Diarios ────────────────────────────────────────────────────────

export const registrarDias = (dto: {
  ordenId: number;
  fechaInicio: string;
  fechaFin: string;
}) =>
  api
    .post<{ data: { diasCreados: number; empleados: number; fechas: number } }>(
      "/registros-diarios/registrar",
      dto,
    )
    .then((r) => r.data.data);

export const fetchRegistrosHabilitados = (
  ordenId: number,
  fechaInicio: string,
  fechaFin: string,
) =>
  api
    .get<{ data: RegistroDiario[] }>(
      `/registros-diarios/habilitados/${ordenId}`,
      { params: { fechaInicio, fechaFin } },
    )
    .then((r) => r.data.data);

export const fetchRegistrosPorOrden = (ordenId: number) =>
  api
    .get<{ data: RegistroDiario[] }>(`/registros-diarios/orden/${ordenId}`)
    .then((r) => r.data.data);

export const activarVigencia = (ordenId?: number) =>
  api
    .post<{ data: { activados: number } }>("/registros-diarios/activar-vigencia", {
      ordenId,
    })
    .then((r) => r.data.data);

export type OrdenTrabajo = {
  id: number;
  numeroOrden: string;
  cantidadRequerida: number;
  pagoUnitario: number;
  fechaLimite: string | null;
  estado: string;
  fechaCreacion: string;
};

export type LoteProduccion = {
  id: number;
  numeroLote: string;
  totalPiezasAprobadas: number;
  fechaEnvio: string;
  estado: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaEliminacion: string | null;
  revisionProduccionId: number;
};

export type StatusPlanilla =
  | "PENDIENTE"
  | "EN_REVISION"
  | "PROCESANDO"
  | "PAGADO"
  | "RECHAZADO"
  | "INACTIVO";

export type MetodoPago = "EFECTIVO" | "TRANSFERENCIA" | "CHEQUE";

export type Planilla = {
  id: number;
  numeroPago: number;
  montoTotal: number;
  descripcion?: string | null;
  metodoPago: string;
  estado: StatusPlanilla;
  fechaPago: string;
  fechaCreacion: string;
  loteProduccion: LoteProduccion | null;
};

export type DetalleEmpleado = {
  empleadoId: number;
  nombreEmpleado: string;
  /** metaIndividual del AsignacionEmpleado (piezas asignadas al empleado) */
  piezasAprobadas: number;
  pagoUnitario: number;
  montoIndividual: number;
};

export type PreviewPlanilla = {
  detalle: ResultadoEmpleado[];
  montoTotal: number;
  pagoUnitario: number;
};

export type GenerarResponse = {
  planilla: Planilla;
  detalle: DetalleEmpleado[];
  montoTotal: number;
};

export type ResultadoEmpleado = {
  empleadoId: number;
  nombreEmpleado: string;
  metaIndividual: number;
  cantidadAprobada: number;
  pagoUnitario: number;
  montoMeta: number;
  montoRealizado: number;
};

export type DetallePlanillaResponse = {
  planilla: Planilla;
  lote: LoteProduccion;
  detalle: ResultadoEmpleado[];
  montoTotal: number;
  pagoUnitario: number;
};

export type EvidenciaTransferencia = {
  metodoPago: "TRANSFERENCIA";
  bancoDestino: string;
  numeroCuenta: string;
  numeroTransferencia: string;
  montoConfirmado: number;
};

export type EvidenciaCheque = {
  metodoPago: "CHEQUE";
  numeroCheque: string;
  bancoEmisor: string;
  fechaCheque: string;
  montoConfirmado: number;
};

export type EvidenciaEfectivo = {
  metodoPago: "EFECTIVO";
  responsableEntrega: string;
  fechaEntrega: string;
  montoConfirmado: number;
};

export type EvidenciaPago =
  | EvidenciaTransferencia
  | EvidenciaCheque
  | EvidenciaEfectivo;

export type EvidenciaForm = {
  metodoPago: MetodoPago;
  montoConfirmado: number;
  bancoDestino: string;
  numeroCuenta: string;
  numeroTransferencia: string;
  numeroCheque: string;
  bancoEmisor: string;
  fechaCheque: string;
  responsableEntrega: string;
  fechaEntrega: string;
};

export const emptyEvidencia = (monto: number): EvidenciaForm => ({
  metodoPago: "EFECTIVO",
  montoConfirmado: monto,
  bancoDestino: "",
  numeroCuenta: "",
  numeroTransferencia: "",
  numeroCheque: "",
  bancoEmisor: "",
  fechaCheque: "",
  responsableEntrega: "",
  fechaEntrega: "",
});

export function buildEvidencia(form: EvidenciaForm): EvidenciaPago {
  const base = { montoConfirmado: form.montoConfirmado };
  if (form.metodoPago === "TRANSFERENCIA") {
    return {
      ...base,
      metodoPago: "TRANSFERENCIA",
      bancoDestino: form.bancoDestino,
      numeroCuenta: form.numeroCuenta,
      numeroTransferencia: form.numeroTransferencia,
    };
  }
  if (form.metodoPago === "CHEQUE") {
    return {
      ...base,
      metodoPago: "CHEQUE",
      numeroCheque: form.numeroCheque,
      bancoEmisor: form.bancoEmisor,
      fechaCheque: form.fechaCheque,
    };
  }
  return {
    ...base,
    metodoPago: "EFECTIVO",
    responsableEntrega: form.responsableEntrega,
    fechaEntrega: form.fechaEntrega,
  };
}

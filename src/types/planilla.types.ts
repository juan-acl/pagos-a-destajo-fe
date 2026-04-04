export type LoteProduccion = {
  id: number;
  numeroLote: string;
  totalPiezasAprobadas: number;
  fechaEnvio: string;
  estado: EstadoLote;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaEliminacion: string | null;
  revisionProduccionId: number;
};

export type Planilla = {
  id: number;
  loteProduccionId: number;
  numeroPago: number;
  montoTotal: number;
  descripcion?: string | null;
  metodoPago: string;
  estado: string;
  loteProduccion: LoteProduccion | null;
};

export type EstadoLote = "ACTIVO" | "INACTIVO" | "ELIMINADO" | "PAGADO";

export type PlanillaForm = Omit<Planilla, "id">;
export const empty: PlanillaForm = {
  loteProduccion: {
    id: 0,
    numeroLote: "",
    totalPiezasAprobadas: 0,
    fechaEnvio: "",
    estado: "PAGADO",
    fechaCreacion: "",
    fechaActualizacion: "",
    fechaEliminacion: null,
    revisionProduccionId: 0,
  },
  loteProduccionId: 0,
  numeroPago: 0,
  montoTotal: 0,
  descripcion: "",
  metodoPago: "EFECTIVO",
  estado: "PAGADO",
};

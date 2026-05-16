export type ModalidadPago = "DESTAJO" | "PAGO_POR_DIAS";
export type TipoPagoDias = "DIAS_VENCIDOS" | "DIAS_FUTUROS";

export type DiaProgramado = {
  id?: number;
  fecha?: string | null;
  estado?: string | null;
  esVigente?: boolean | null;
  monto?: number | null;
};

export const modalidadLabel: Record<ModalidadPago, string> = {
  DESTAJO: "DESTAJO",
  PAGO_POR_DIAS: "PAGO POR DÍAS",
};

export const tipoPagoDiasLabel: Record<TipoPagoDias, string> = {
  DIAS_VENCIDOS: "DÍAS VENCIDOS",
  DIAS_FUTUROS: "DÍAS FUTUROS",
};

export const todayISO = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

export const normalizeDateInput = (value?: string | null) => {
  if (!value) return "";
  return value.slice(0, 10);
};

const asDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${normalizeDateInput(value)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const calculateInclusiveDays = (start?: string | null, end?: string | null) => {
  const startDate = asDate(start);
  const endDate = asDate(end);
  if (!startDate || !endDate || endDate < startDate) return 0;
  const diff = endDate.getTime() - startDate.getTime();
  return Math.floor(diff / 86_400_000) + 1;
};

export const money = (value?: number | string | null) =>
  `Q ${Number(value ?? 0).toFixed(2)}`;

export const normalizeModalidadPago = (value?: string | null): ModalidadPago =>
  value === "PAGO_POR_DIAS" ? "PAGO_POR_DIAS" : "DESTAJO";

export const normalizeTipoPagoDias = (value?: string | null): TipoPagoDias =>
  value === "DIAS_FUTUROS" ? "DIAS_FUTUROS" : "DIAS_VENCIDOS";

export const getDiasText = (count: number) => `${count} día${count === 1 ? "" : "s"}`;


export const normalizeEstadoOperativo = (value?: string | null) =>
  String(value ?? "").trim().toUpperCase();

export const isActiveStatus = (value?: string | null) => {
  const estado = normalizeEstadoOperativo(value);
  return ["ACTIVO", "ACTIVA", "ACTIVE", "VIGENTE", "EN_PROCESO"].includes(estado);
};

export const isInactiveStatus = (value?: string | null) => {
  const estado = normalizeEstadoOperativo(value);
  return ["INACTIVO", "INACTIVA", "INACTIVE", "BAJA", "BAJO"].includes(estado);
};

export const getEstadoVigenciaDia = (dia: DiaProgramado) => {
  if (dia.estado) return dia.estado;
  const fecha = normalizeDateInput(dia.fecha);
  if (!fecha) return "PENDIENTE";
  return fecha <= todayISO() || dia.esVigente ? "VIGENTE" : "PENDIENTE";
};

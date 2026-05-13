import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import { crudStyles as s } from "@/styles/crudStyles";
import { getErrorMessage } from "@/utils/api";
import { useAuthStore, getRoleName, isJefe } from "@/store/authStore";
import {
  calculateInclusiveDays,
  getDiasText,
  getEstadoVigenciaDia,
  modalidadLabel,
  money,
  normalizeDateInput,
  normalizeModalidadPago,
  normalizeTipoPagoDias,
  tipoPagoDiasLabel,
  todayISO,
  type DiaProgramado,
  type ModalidadPago,
  type TipoPagoDias,
} from "@/utils/productionFlow";

type OrdenTrabajo = {
  id: number;
  numeroOrden: string;
  estado?: string | null;
  cantidadRequerida?: number | null;
  pagoUnitario?: number | null;
};

type Cuadrilla = { id: number; nombre: string; };

type AsignacionOrdenCuadrilla = {
  id: number;
  ordenTrabajoId: number;
  cuadrillaId: number;
  cantidadAsignada: number;
  estado: string;
  modalidadPago?: ModalidadPago | string | null;
  tipoPagoDias?: TipoPagoDias | string | null;
  montoDiario?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  diasSeleccionados?: number | null;
  totalDias?: number | null;
  montoTotalProyectado?: number | null;
  diasProgramados?: DiaProgramado[] | null;
};

type AsignacionForm = {
  ordenTrabajoId: number;
  cuadrillaId: number;
  cantidadAsignada: number;
  estado: string;
  modalidadPago: ModalidadPago;
  tipoPagoDias: TipoPagoDias;
  montoDiario: number;
  fechaInicio: string;
  fechaFin: string;
};

const empty: AsignacionForm = {
  ordenTrabajoId: 0,
  cuadrillaId: 0,
  cantidadAsignada: 0,
  estado: "activo",
  modalidadPago: "DESTAJO",
  tipoPagoDias: "DIAS_VENCIDOS",
  montoDiario: 0,
  fechaInicio: "",
  fechaFin: "",
};

const fetcherAsignaciones = () => api.get<{ data: AsignacionOrdenCuadrilla[] }>("/asignaciones-orden-cuadrilla").then(r => r.data.data);
const fetcherOrdenes = () => api.get<{ data: OrdenTrabajo[] }>("/ordenes-trabajo").then(r => r.data.data);
const fetcherCuadrillas = () => api.get<{ data: Cuadrilla[] }>("/cuadrillas").then(r => r.data.data);

const isOrdenEnProceso = (orden?: OrdenTrabajo | null) =>
  (orden?.estado ?? "").toUpperCase() === "EN_PROCESO";

const getDiasAsignacion = (a: AsignacionOrdenCuadrilla) =>
  Number(a.diasSeleccionados ?? a.totalDias ?? calculateInclusiveDays(a.fechaInicio, a.fechaFin));

const getMontoProyectado = (a: AsignacionOrdenCuadrilla) =>
  Number(a.montoTotalProyectado ?? Number(a.montoDiario ?? 0) * getDiasAsignacion(a));

export default function AsignacionOrdenCuadrilla() {
  const qc = useQueryClient();
  const { empleado } = useAuthStore();
  const [form, setForm] = useState<AsignacionForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({ queryKey: ["asignaciones-orden-cuadrilla"], queryFn: fetcherAsignaciones });
  const { data: ordenes = [] } = useQuery({ queryKey: ["ordenes-trabajo"], queryFn: fetcherOrdenes });
  const { data: cuadrillas = [] } = useQuery({ queryKey: ["cuadrillas"], queryFn: fetcherCuadrillas });

  const selectedOrden = useMemo(
    () => ordenes.find((orden) => orden.id === Number(form.ordenTrabajoId)) ?? null,
    [form.ordenTrabajoId, ordenes],
  );

  const diasCalculados = useMemo(
    () => calculateInclusiveDays(form.fechaInicio, form.fechaFin),
    [form.fechaInicio, form.fechaFin],
  );

  const montoTotalDias = Number(form.montoDiario || 0) * diasCalculados;
  const rolActual = getRoleName(empleado);
  const rolNoAutorizado = rolActual.length > 0 && !isJefe(empleado);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["asignaciones-orden-cuadrilla"] });
    qc.invalidateQueries({ queryKey: ["employee-assignment-panels"] });
    qc.invalidateQueries({ queryKey: ["production-review-pending"] });
    reset();
  };

  const create = useMutation({
    mutationFn: (d: AsignacionForm) => api.post("/asignaciones-orden-cuadrilla", buildPayload(d)),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: (d: AsignacionForm) => api.put(`/asignaciones-orden-cuadrilla/${editId}`, buildPayload(d)),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/asignaciones-orden-cuadrilla/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["asignaciones-orden-cuadrilla"] }),
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  function buildPayload(d: AsignacionForm) {
    const modalidad = normalizeModalidadPago(d.modalidadPago);
    const cantidadAsignada = modalidad === "PAGO_POR_DIAS"
      ? calculateInclusiveDays(d.fechaInicio, d.fechaFin)
      : Number(d.cantidadAsignada);

    return {
      ordenTrabajoId: Number(d.ordenTrabajoId),
      cuadrillaId: Number(d.cuadrillaId),
      cantidadAsignada,
      estado: d.estado,
      modalidadPago: modalidad,
      tipoPagoDias: modalidad === "PAGO_POR_DIAS" ? normalizeTipoPagoDias(d.tipoPagoDias) : null,
      montoDiario: modalidad === "PAGO_POR_DIAS" ? Number(d.montoDiario) : null,
      fechaInicio: modalidad === "PAGO_POR_DIAS" ? d.fechaInicio : null,
      fechaFin: modalidad === "PAGO_POR_DIAS" ? d.fechaFin : null,
    };
  }

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setOpen(false);
    setMessage(null);
  };

  const edit = (a: AsignacionOrdenCuadrilla) => {
    const modalidad = normalizeModalidadPago(a.modalidadPago);
    setForm({
      ordenTrabajoId: a.ordenTrabajoId,
      cuadrillaId: a.cuadrillaId,
      cantidadAsignada: a.cantidadAsignada,
      estado: a.estado,
      modalidadPago: modalidad,
      tipoPagoDias: normalizeTipoPagoDias(a.tipoPagoDias),
      montoDiario: Number(a.montoDiario ?? 0),
      fechaInicio: normalizeDateInput(a.fechaInicio),
      fechaFin: normalizeDateInput(a.fechaFin),
    });
    setEditId(a.id);
    setMessage(null);
    setOpen(true);
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === "modalidadPago") {
        const modalidad = normalizeModalidadPago(value);
        return {
          ...prev,
          modalidadPago: modalidad,
          fechaInicio: modalidad === "PAGO_POR_DIAS" && prev.tipoPagoDias === "DIAS_FUTUROS" ? todayISO() : prev.fechaInicio,
        };
      }

      if (name === "tipoPagoDias") {
        const tipo = normalizeTipoPagoDias(value);
        return {
          ...prev,
          tipoPagoDias: tipo,
          fechaInicio: tipo === "DIAS_FUTUROS" ? todayISO() : prev.fechaInicio,
        };
      }

      const numericFields = new Set(["cantidadAsignada", "ordenTrabajoId", "cuadrillaId", "montoDiario"]);
      return { ...prev, [name]: numericFields.has(name) ? Number(value) : value };
    });
  };

  const validate = () => {
    if (rolNoAutorizado) {
      return "Solo un usuario con rol JEFE puede definir la modalidad de control de la orden.";
    }

    if (!selectedOrden) {
      return "Debes seleccionar una orden de trabajo válida.";
    }

    if (!isOrdenEnProceso(selectedOrden)) {
      return "La orden seleccionada debe estar en estado EN_PROCESO para registrar modalidad.";
    }

    if (!form.cuadrillaId) {
      return "Debes seleccionar la cuadrilla asignada a la orden.";
    }

    if (form.modalidadPago === "DESTAJO") {
      if (!form.cantidadAsignada || Number(form.cantidadAsignada) <= 0) {
        return "La cantidad asignada a la cuadrilla debe ser mayor a cero.";
      }
      return null;
    }

    if (!form.montoDiario || Number(form.montoDiario) <= 0) {
      return "El monto diario debe ser mayor a cero.";
    }

    if (!form.fechaInicio || !form.fechaFin) {
      return "Debes seleccionar fecha inicial y fecha final para el pago por días.";
    }

    if (form.fechaFin < form.fechaInicio) {
      return "El rango de fechas no es válido: la fecha final no puede ser menor que la inicial.";
    }

    if (form.tipoPagoDias === "DIAS_VENCIDOS" && form.fechaFin > todayISO()) {
      return "Para días vencidos, la fecha final debe ser igual o anterior a la fecha actual.";
    }

    if (form.tipoPagoDias === "DIAS_FUTUROS" && form.fechaFin <= todayISO()) {
      return "Para días futuros, la fecha final debe ser posterior a la fecha actual.";
    }

    return null;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate();
    if (validation) {
      setMessage(validation);
      return;
    }
    setMessage(null);
    editId ? update.mutate(form) : create.mutate(form);
  };

  const getOrdenNumero = (id: number) => ordenes.find(o => o.id === id)?.numeroOrden ?? "-";
  const getOrden = (id: number) => ordenes.find(o => o.id === id) ?? null;
  const getCuadrillaName = (id: number) => cuadrillas.find(c => c.id === id)?.nombre ?? "-";

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.titleGroup}>
          <h1 style={s.title}>Asignación de Orden a Cuadrilla</h1>
          <p style={s.description}>Defina la cuadrilla y la modalidad de control de la orden activa.</p>
        </div>
        <button style={s.btnPrimary} onClick={() => { reset(); setOpen(true); }}>+ Nueva</button>
      </div>

      {message && <div style={s.error}>{message}</div>}

      {open && (
        <div style={s.card}>
          <h2 style={s.subtitle}>{editId ? "Editar" : "Nueva"} asignación</h2>
          <form onSubmit={submit}>
            <div style={s.grid}>
              <label style={s.label}>
                Orden de trabajo *
                <select name="ordenTrabajoId" value={form.ordenTrabajoId} onChange={change} required style={s.input}>
                  <option value={0}>Seleccionar orden</option>
                  {ordenes.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.numeroOrden}{o.estado ? ` · ${o.estado}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label style={s.label}>
                Cuadrilla *
                <select name="cuadrillaId" value={form.cuadrillaId} onChange={change} required style={s.input}>
                  <option value={0}>Seleccionar cuadrilla</option>
                  {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <label style={s.label}>
                Modalidad de control *
                <select name="modalidadPago" value={form.modalidadPago} onChange={change} required style={s.input}>
                  <option value="DESTAJO">DESTAJO</option>
                  <option value="PAGO_POR_DIAS">PAGO POR DÍAS</option>
                </select>
              </label>
              <label style={s.label}>
                Estado
                <select name="estado" value={form.estado} onChange={change} style={s.input}>
                  <option value="activo">ACTIVO</option>
                  <option value="inactivo">INACTIVO</option>
                </select>
              </label>

              {form.modalidadPago === "DESTAJO" ? (
                <>
                  <label style={s.label}>
                    Cantidad asignada a la cuadrilla *
                    <input name="cantidadAsignada" type="number" value={form.cantidadAsignada} onChange={change} required min={1} style={s.input} />
                  </label>
                  <div style={{ ...s.label, justifyContent: "center" }}>
                    Pago unitario de la orden
                    <strong style={{ color: "#1e293b" }}>{money(selectedOrden?.pagoUnitario)}</strong>
                  </div>
                </>
              ) : (
                <>
                  <label style={s.label}>
                    Variante de pago por días *
                    <select name="tipoPagoDias" value={form.tipoPagoDias} onChange={change} required style={s.input}>
                      <option value="DIAS_VENCIDOS">DÍAS VENCIDOS</option>
                      <option value="DIAS_FUTUROS">DÍAS FUTUROS / PROGRAMADOS</option>
                    </select>
                  </label>
                  <label style={s.label}>
                    Monto diario *
                    <input name="montoDiario" type="number" step="0.01" value={form.montoDiario} onChange={change} required min={0.01} style={s.input} />
                  </label>
                  <label style={s.label}>
                    Fecha inicial *
                    <input name="fechaInicio" type="date" value={form.fechaInicio} onChange={change} required readOnly={form.tipoPagoDias === "DIAS_FUTUROS"} style={form.tipoPagoDias === "DIAS_FUTUROS" ? s.inputReadonly : s.input} />
                  </label>
                  <label style={s.label}>
                    Fecha final *
                    <input name="fechaFin" type="date" value={form.fechaFin} onChange={change} required style={s.input} />
                  </label>
                  <div style={{ ...s.label, gridColumn: "1 / -1", flexDirection: "row", gap: "16px", color: "#64748b", fontSize: "13px" }}>
                    <span>Días seleccionados: <strong>{getDiasText(diasCalculados)}</strong></span>
                    <span>Total proyectado: <strong>{money(montoTotalDias)}</strong></span>
                    <span>Estado inicial: <strong>{form.tipoPagoDias === "DIAS_FUTUROS" ? "PENDIENTE DE VIGENCIA" : "VIGENTE"}</strong></span>
                  </div>
                </>
              )}
            </div>
            <div style={s.row}>
              <button type="submit" style={s.btnPrimary} disabled={create.isPending || update.isPending}>Guardar</button>
              <button type="button" style={s.btnSecondary} onClick={reset}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={s.card}>
        <div style={s.tableWrap}>
          {isLoading ? <p style={s.empty}>Cargando...</p> : data.length === 0 ? <p style={s.empty}>Sin registros</p> : (
            <table style={s.table}>
              <thead><tr style={s.thead}>
                {["Orden", "Cuadrilla", "Modalidad", "Referencia", "Pago", "Fechas/Días", "Estado", "Acciones"].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {data.map(a => {
                  const modalidad = normalizeModalidadPago(a.modalidadPago);
                  const orden = getOrden(a.ordenTrabajoId);
                  const dias = getDiasAsignacion(a);
                  return (
                    <tr key={a.id} style={s.tr}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600 }}>{getOrdenNumero(a.ordenTrabajoId)}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{orden?.estado ?? "-"}</div>
                      </td>
                      <td style={s.td}>{getCuadrillaName(a.cuadrillaId)}</td>
                      <td style={s.td}>{modalidadLabel[modalidad]}</td>
                      <td style={s.td}>{modalidad === "DESTAJO" ? `${a.cantidadAsignada} piezas` : getDiasText(dias)}</td>
                      <td style={s.td}>{modalidad === "DESTAJO" ? `${money(orden?.pagoUnitario)} / pieza` : `${money(a.montoDiario)} / día`}</td>
                      <td style={s.td}>
                        {modalidad === "DESTAJO" ? (
                          <span style={{ color: "#64748b" }}>Cantidad visual de cuadrilla</span>
                        ) : (
                          <div>
                            <div>{normalizeDateInput(a.fechaInicio) || "-"} → {normalizeDateInput(a.fechaFin) || "-"}</div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>{tipoPagoDiasLabel[normalizeTipoPagoDias(a.tipoPagoDias)]} · Total {money(getMontoProyectado(a))}</div>
                            {!!a.diasProgramados?.length && (
                              <div style={{ fontSize: "12px", color: "#64748b" }}>
                                {a.diasProgramados.slice(0, 3).map((dia) => `${normalizeDateInput(dia.fecha)}: ${getEstadoVigenciaDia(dia)}`).join(" · ")}
                                {a.diasProgramados.length > 3 ? " · ..." : ""}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={s.td}><span style={a.estado === "activo" ? s.activo : s.inactivo}>{a.estado.toUpperCase()}</span></td>
                      <td style={{ ...s.td, ...s.actionCell }}>
                        <button style={s.btnEdit} onClick={() => edit(a)}>Editar</button>
                        <button style={s.btnDelete} onClick={() => remove.mutate(a.id)}>Eliminar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import { crudStyles as s } from "@/styles/crudStyles";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";

type EstadoRevision = "PENDIENTE_REVISION" | "APROBADO" | "OBSERVADO";

type ProductionReview = {
  id: number;
  cantidadRecibida: number;
  cantidadAprobada: number;
  porcentajeRechazo: number;
  estadoRevision: EstadoRevision;
  observaciones?: string | null;
  fechaRevision?: string | null;
  revisadoPor?: string | null;
  asignacionEmpleadoId: EmployeeAssignment;
};

type EmployeeAssignment = {
  id: number;
  metaIndividual: number;
  estado: string;
  cuadrillaId: number;
  empleadoNombre?: string;
};

type ReviewForm = {
  cantidadRecibida: number | "";
  cantidadAprobada: number | "";
  observaciones: string;
};

const emptyForm: ReviewForm = {
  cantidadRecibida: "",
  cantidadAprobada: "",
  observaciones: "",
};

const fetchReviews = () =>
  api.get<ApiEnvelope<ProductionReview[]>>("/production-review")
    .then(r => r.data.data);

const fetchAssignments = () =>
  api.get<ApiEnvelope<EmployeeAssignment[]>>("/employee-assignment")
    .then(r => r.data.data);

function calcRechazo(recibida: number, aprobada: number): number {
  if (recibida <= 0) return 0;
  return ((recibida - aprobada) / recibida) * 100;
}

function estadoDesdeRechazo(pct: number): EstadoRevision {
  return pct <= 20 ? "APROBADO" : "OBSERVADO";
}

function badgeStyle(estado: EstadoRevision): React.CSSProperties {
  if (estado === "APROBADO") return { background: "#dcfce7", color: "#166534", borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 600, display: "inline-flex" };
  if (estado === "OBSERVADO") return { background: "#fef9c3", color: "#854d0e", borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 600, display: "inline-flex" };
  return { background: "#e0f2fe", color: "#0369a1", borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 600, display: "inline-flex" };
}

export default function RevisionDestajoPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<ReviewForm>(emptyForm);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["production-review"],
    queryFn: fetchReviews,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["employee-assignment"],
    queryFn: fetchAssignments,
  });

  const recibida = form.cantidadRecibida === "" ? 0 : Number(form.cantidadRecibida);
  const aprobada = form.cantidadAprobada === "" ? 0 : Number(form.cantidadAprobada);
  const pctRechazo = recibida > 0 ? calcRechazo(recibida, aprobada) : null;
  const estadoResultante: EstadoRevision | null = pctRechazo !== null ? estadoDesdeRechazo(pctRechazo) : null;
  const requiereObservaciones = estadoResultante === "OBSERVADO";

  const formValido = useMemo(() => {
    if (recibida <= 0) return false;
    if (form.cantidadAprobada === "") return false;
    if (aprobada > recibida) return false;
    if (requiereObservaciones && form.observaciones.trim() === "") return false;
    return true;
  }, [recibida, aprobada, form.cantidadAprobada, requiereObservaciones, form.observaciones]);

  const selectedReview = reviews.find(r => r.id === selectedId) ?? null;

  const reset = () => { setForm(emptyForm); setSelectedId(null); setMessage(null); };

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["production-review"] });
    reset();
  };

  const revisar = useMutation({
    mutationFn: (payload: { id: number; cantidadRecibida: number; cantidadAprobada: number; porcentajeRechazo: number; estadoRevision: EstadoRevision; observaciones: string | null }) =>
      api.put(`/production-review/${payload.id}`, {
        cantidadRecibida: payload.cantidadRecibida,
        cantidadAprobada: payload.cantidadAprobada,
        porcentajeRechazo: payload.porcentajeRechazo,
        estadoRevision: payload.estadoRevision,
        observaciones: payload.observaciones,
        fechaRevision: new Date().toISOString(),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!selectedReview) return;
    if (selectedReview.estadoRevision !== "PENDIENTE_REVISION") {
      setMessage("Este reporte ya fue procesado anteriormente y no puede revisarse de nuevo.");
      return;
    }
    if (recibida <= 0) { setMessage("La cantidad recibida debe ser mayor a cero."); return; }
    if (aprobada > recibida) { setMessage("La cantidad aprobada no puede ser mayor a la cantidad recibida."); return; }
    if (!estadoResultante) return;
    if (estadoResultante === "OBSERVADO" && form.observaciones.trim() === "") {
      setMessage("Las observaciones son obligatorias cuando el porcentaje de rechazo supera el 20%.");
      return;
    }
    revisar.mutate({
      id: selectedReview.id,
      cantidadRecibida: recibida,
      cantidadAprobada: aprobada,
      porcentajeRechazo: pctRechazo!,
      estadoRevision: estadoResultante,
      observaciones: form.observaciones.trim() || null,
    });
  };

  const getAssignmentLabel = (a: EmployeeAssignment) =>
    a.empleadoNombre
      ? `${a.empleadoNombre} — Meta: ${a.metaIndividual}`
      : `Asignación #${a.id} — Meta: ${a.metaIndividual}`;

  const pendientes = reviews.filter(r => r.estadoRevision === "PENDIENTE_REVISION").length;
  const aprobadas = reviews.filter(r => r.estadoRevision === "APROBADO").length;
  const observadas = reviews.filter(r => r.estadoRevision === "OBSERVADO").length;
  const loteListoParaGenerar = pendientes === 0 && reviews.length > 0;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.titleGroup}>
          <h1 style={s.title}>Revisión y Aprobación de Producción</h1>
          <p style={s.description}>Selecciona un reporte en estado PENDIENTE_REVISION para procesarlo</p>
        </div>
      </div>

      {message && <div style={s.error}>{message}</div>}

      <div style={{
        ...s.card,
        borderLeft: `4px solid ${loteListoParaGenerar ? "#16a34a" : "#f59e0b"}`,
        padding: "16px 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: "14px", color: loteListoParaGenerar ? "#16a34a" : "#92400e" }}>
              {loteListoParaGenerar ? "✅ Lote listo para generarse" : `⏳ ${pendientes} revisión(es) pendiente(s) bloquean el lote`}
            </span>
          </div>
          <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
            <span style={{ color: "#0369a1" }}>🔵 Pendientes: <strong>{pendientes}</strong></span>
            <span style={{ color: "#166534" }}>🟢 Aprobadas: <strong>{aprobadas}</strong></span>
            <span style={{ color: "#854d0e" }}>🟡 Observadas: <strong>{observadas}</strong></span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedId ? "1fr 1fr" : "1fr", gap: "20px", alignItems: "start" }}>
        <div style={s.card}>
          <h2 style={s.subtitle}>Reportes de producción</h2>
          <div style={s.tableWrap}>
            {isLoading ? (
              <p style={s.empty}>Cargando...</p>
            ) : reviews.length === 0 ? (
              <p style={s.empty}>Sin reportes registrados</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {["Empleado / Asignación", "Reportado", "Estado", "Acción"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reviews.map(item => {
                    const esPendiente = item.estadoRevision === "PENDIENTE_REVISION";
                    const isSelected = selectedId === item.id;
                    console.log("item:", item.id, "| estadoRevision:", JSON.stringify(item.estadoRevision), "| esPendiente:", esPendiente);
                    return (
                      <tr key={item.id} style={{ ...s.tr, background: isSelected ? "rgba(45,106,79,0.06)" : undefined }}>
                        <td style={s.td}>{getAssignmentLabel(item.asignacionEmpleadoId)}</td>
                        <td style={s.td}>{item.cantidadRecibida ?? "—"}</td>
                        <td style={s.td}>
                          <span style={badgeStyle(item.estadoRevision)}>{item.estadoRevision}</span>
                        </td>
                        <td style={{ ...s.td, ...s.actionCell }}>
                          {esPendiente ? (
                            <button
                              style={{ ...s.btnPrimary, padding: "5px 12px", fontSize: "13px", background: isSelected ? "#15803d" : undefined }}
                              onClick={() => { setSelectedId(isSelected ? null : item.id); setForm(emptyForm); setMessage(null); }}
                            >
                              {isSelected ? "Cerrar" : "Revisar"}
                            </button>
                          ) : item.estadoRevision === "APROBADO" ? (
                            <span style={{ fontSize: "12px", color: "#166534" }}>✓ Aprobado</span>
                          ) : item.estadoRevision === "OBSERVADO" ? (
                            <span style={{ fontSize: "12px", color: "#854d0e" }}>⚠ Observado</span>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Procesado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {selectedReview && (
          <div style={{ ...s.card, position: "sticky", top: "80px" }}>
            <h2 style={s.subtitle}>Procesar revisión</h2>
            <div style={{ ...s.info, marginBottom: "16px" }}>
              <strong>Asignación:</strong> {getAssignmentLabel(selectedReview.asignacionEmpleadoId)}<br />
              <strong>Cantidad reportada:</strong> {selectedReview.asignacionEmpleadoId.metaIndividual} unidades
            </div>

            <form onSubmit={submit}>
              <div style={s.grid}>
                <label style={s.label}>
                  Cantidad recibida *
                  <input name="cantidadRecibida" type="number" min={1} value={form.cantidadRecibida}
                    onChange={e => setForm(p => ({ ...p, cantidadRecibida: e.target.value === "" ? "" : Number(e.target.value) }))}
                    required style={s.input} />
                </label>
                <label style={s.label}>
                  Cantidad aprobada *
                  <input name="cantidadAprobada" type="number" min={0} value={form.cantidadAprobada}
                    onChange={e => setForm(p => ({ ...p, cantidadAprobada: e.target.value === "" ? "" : Number(e.target.value) }))}
                    required style={{ ...s.input, borderColor: aprobada > recibida ? "#ef4444" : undefined }} />
                  {aprobada > recibida && recibida > 0 && (
                    <span style={{ color: "#ef4444", fontSize: "12px" }}>No puede ser mayor a la cantidad recibida</span>
                  )}
                </label>
              </div>

              {pctRechazo !== null && recibida > 0 && (
                <div style={{
                  margin: "16px 0", padding: "14px 16px", borderRadius: "10px",
                  background: estadoResultante === "APROBADO" ? "#f0fdf4" : "#fefce8",
                  border: `1px solid ${estadoResultante === "APROBADO" ? "#86efac" : "#fde047"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Porcentaje de rechazo</span>
                    <span style={{ fontSize: "20px", fontWeight: 700, color: estadoResultante === "APROBADO" ? "#16a34a" : "#d97706" }}>
                      {pctRechazo.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ background: "#e5e7eb", borderRadius: "999px", height: "8px", overflow: "hidden", marginBottom: "10px" }}>
                    <div style={{
                      width: `${Math.min(pctRechazo, 100)}%`, height: "100%",
                      background: estadoResultante === "APROBADO" ? "#16a34a" : "#f59e0b",
                      borderRadius: "999px", transition: "width 0.3s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#6B7280" }}>
                      Límite: 20% | Rechazadas: {recibida - aprobada} unidades
                    </span>
                    <span style={badgeStyle(estadoResultante!)}> → {estadoResultante}</span>
                  </div>
                </div>
              )}

              {requiereObservaciones && (
                <label style={{ ...s.label, marginTop: "12px" }}>
                  Observaciones * <span style={{ color: "#ef4444", fontSize: "12px" }}>(obligatorio cuando el rechazo supera el 20%)</span>
                  <textarea name="observaciones" value={form.observaciones}
                    onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                    required placeholder="Describe el motivo del rechazo o las observaciones de calidad..."
                    style={{ ...s.input, minHeight: 100, resize: "vertical", marginTop: "4px" }} />
                </label>
              )}

              {!requiereObservaciones && pctRechazo !== null && (
                <label style={{ ...s.label, marginTop: "12px" }}>
                  Observaciones (opcional)
                  <textarea name="observaciones" value={form.observaciones}
                    onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                    placeholder="Observaciones adicionales..."
                    style={{ ...s.input, minHeight: 80, resize: "vertical", marginTop: "4px" }} />
                </label>
              )}

              <div style={s.row}>
                <button type="submit" style={{ ...s.btnPrimary, opacity: formValido ? 1 : 0.5, cursor: formValido ? "pointer" : "not-allowed" }}
                  disabled={!formValido || revisar.isPending}>
                  {revisar.isPending ? "Procesando..." : "Confirmar revisión"}
                </button>
                <button type="button" style={s.btnSecondary} onClick={reset}>Cancelar</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
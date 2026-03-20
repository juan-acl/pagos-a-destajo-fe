import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import AppShell from "@/components/layout/AppShell";
import { crudStyles as s } from "@/styles/crudStyles";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";

type ProductionReview = {
  id: number;
  cantidadRecibida: number;
  cantidadAprobada: number;
  estadoRevision: string;
  observaciones?: string | null;
  fechaRevision: string;
  asignacionEmpleadoId: number;
};

type ProductionReviewForm = {
  cantidadRecibida: number | "";
  cantidadAprobada: number | "";
  estadoRevision: string;
  observaciones: string;
  fechaRevision: string;
  asignacionEmpleadoId: number | "";
};

const empty: ProductionReviewForm = {
  cantidadRecibida: "",
  cantidadAprobada: "",
  estadoRevision: "PENDIENTE",
  observaciones: "",
  fechaRevision: "",
  asignacionEmpleadoId: "",
};

const fetcher = () =>
  api
    .get<ApiEnvelope<ProductionReview[]>>("/production-review")
    .then((response) => response.data.data);

export default function ProductionReviewPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductionReviewForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["production-review"],
    queryFn: fetcher,
  });

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setOpen(false);
    setMessage(null);
  };

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["production-review"] });
    reset();
  };

  const create = useMutation({
    mutationFn: (payload: ProductionReviewForm) =>
      api.post("/production-review", {
        cantidadRecibida: Number(payload.cantidadRecibida),
        cantidadAprobada: Number(payload.cantidadAprobada),
        estadoRevision: payload.estadoRevision,
        observaciones: payload.observaciones || undefined,
        fechaRevision: payload.fechaRevision,
        asignacionEmpleadoId: Number(payload.asignacionEmpleadoId),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: (payload: ProductionReviewForm) =>
      api.put(`/production-review/${editId}`, {
        cantidadRecibida: Number(payload.cantidadRecibida),
        cantidadAprobada: Number(payload.cantidadAprobada),
        estadoRevision: payload.estadoRevision,
        observaciones: payload.observaciones || undefined,
        fechaRevision: payload.fechaRevision,
        asignacionEmpleadoId: Number(payload.asignacionEmpleadoId),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/production-review/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["production-review"] });
      setMessage(null);
    },
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const edit = (item: ProductionReview) => {
    setForm({
      cantidadRecibida: item.cantidadRecibida,
      cantidadAprobada: item.cantidadAprobada,
      estadoRevision: item.estadoRevision,
      observaciones: item.observaciones ?? "",
      fechaRevision: item.fechaRevision?.slice(0, 10) ?? "",
      asignacionEmpleadoId: item.asignacionEmpleadoId,
    });
    setEditId(item.id);
    setOpen(true);
    setMessage(null);
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "cantidadRecibida" || name === "cantidadAprobada" || name === "asignacionEmpleadoId"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (editId) {
      update.mutate(form);
      return;
    }
    create.mutate(form);
  };

  return (
    <AppShell>
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.titleGroup}>
            <h1 style={s.title}>Revisión de producción</h1>
          </div>
          <button
            style={s.btnPrimary}
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            + Nueva revisión
          </button>
        </div>

        {message && <div style={s.error}>{message}</div>}

        {open && (
          <div style={s.card}>
            <h2 style={s.subtitle}>{editId ? "Editar" : "Nueva"} revisión</h2>
            <form onSubmit={submit}>
              <div style={s.grid}>
                <label style={s.label}>
                  Cantidad recibida *
                  <input name="cantidadRecibida" type="number" value={form.cantidadRecibida} onChange={change} required style={s.input} />
                </label>
                <label style={s.label}>
                  Cantidad aprobada *
                  <input name="cantidadAprobada" type="number" value={form.cantidadAprobada} onChange={change} required style={s.input} />
                </label>
                <label style={s.label}>
                  Estado revisión
                  <select name="estadoRevision" value={form.estadoRevision} onChange={change} style={s.input}>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="APROBADO">APROBADO</option>
                    <option value="RECHAZADO">RECHAZADO</option>
                  </select>
                </label>
                <label style={s.label}>
                  Fecha revisión *
                  <input name="fechaRevision" type="date" value={form.fechaRevision} onChange={change} required style={s.input} />
                </label>
                <label style={s.label}>
                  Asignación empleado ID *
                  <input name="asignacionEmpleadoId" type="number" value={form.asignacionEmpleadoId} onChange={change} required style={s.input} />
                </label>
                <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                  Observaciones
                  <textarea name="observaciones" value={form.observaciones} onChange={change} style={{ ...s.input, minHeight: "90px", resize: "vertical" }} />
                </label>
              </div>
              <div style={s.row}>
                <button type="submit" style={s.btnPrimary}>
                  {create.isPending || update.isPending ? "Guardando..." : "Guardar"}
                </button>
                <button type="button" style={s.btnSecondary} onClick={reset}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={s.card}>
          <div style={s.tableWrap}>
            {isLoading ? (
              <p style={s.empty}>Cargando...</p>
            ) : data.length === 0 ? (
              <p style={s.empty}>Sin registros</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {["ID", "Recibida", "Aprobada", "Estado", "Fecha", "Asignación", "Observaciones", "Acciones"].map((h) => (
                      <th key={h} style={s.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} style={s.tr}>
                      <td style={s.td}>{item.id}</td>
                      <td style={s.td}>{item.cantidadRecibida}</td>
                      <td style={s.td}>{item.cantidadAprobada}</td>
                      <td style={s.td}>
                        <span style={item.estadoRevision === "APROBADO" ? s.activo : s.inactivo}>{item.estadoRevision}</span>
                      </td>
                      <td style={s.td}>{item.fechaRevision?.slice(0, 10) ?? "-"}</td>
                      <td style={s.td}>{item.asignacionEmpleadoId}</td>
                      <td style={s.td}>{item.observaciones || "-"}</td>
                      <td style={{ ...s.td, ...s.actionCell }}>
                        <button style={s.btnEdit} onClick={() => edit(item)}>
                          Editar
                        </button>
                        <button style={s.btnDelete} onClick={() => remove.mutate(item.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

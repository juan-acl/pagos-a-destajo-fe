import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import { crudStyles as s } from "@/styles/crudStyles";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";

type ProductionLot = {
  id: number;
  numeroLote: string;
  totalPiezasAprobadas: number;
  fechaEnvio: string;
  estado: string;
  revisionProduccionId?: number | null;
};

type ProductionLotForm = {
  numeroLote: string;
  totalPiezasAprobadas: number | "";
  fechaEnvio: string;
  estado: string;
  revisionProduccionId: number | "";
};

const empty: ProductionLotForm = {
  numeroLote: "",
  totalPiezasAprobadas: "",
  fechaEnvio: "",
  estado: "ACTIVO",
  revisionProduccionId: "",
};

const fetcher = () =>
  api
    .get<ApiEnvelope<ProductionLot[]>>("/production-lot")
    .then((response) => response.data.data);

export default function ProductionLotPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductionLotForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["production-lot"],
    queryFn: fetcher,
  });

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setOpen(false);
    setMessage(null);
  };

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["production-lot"] });
    reset();
  };

  const create = useMutation({
    mutationFn: (payload: ProductionLotForm) =>
      api.post("/production-lot", {
        numeroLote: payload.numeroLote,
        totalPiezasAprobadas: Number(payload.totalPiezasAprobadas),
        fechaEnvio: payload.fechaEnvio,
        estado: payload.estado,
        revisionProduccionId:
          payload.revisionProduccionId === ""
            ? undefined
            : Number(payload.revisionProduccionId),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: (payload: ProductionLotForm) =>
      api.put(`/production-lot/${editId}`, {
        numeroLote: payload.numeroLote,
        totalPiezasAprobadas: Number(payload.totalPiezasAprobadas),
        fechaEnvio: payload.fechaEnvio,
        estado: payload.estado,
        revisionProduccionId:
          payload.revisionProduccionId === ""
            ? undefined
            : Number(payload.revisionProduccionId),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/production-lot/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["production-lot"] });
      setMessage(null);
    },
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const edit = (item: ProductionLot) => {
    setForm({
      numeroLote: item.numeroLote,
      totalPiezasAprobadas: item.totalPiezasAprobadas,
      fechaEnvio: item.fechaEnvio?.slice(0, 10) ?? "",
      estado: item.estado,
      revisionProduccionId: item.revisionProduccionId ?? "",
    });
    setEditId(item.id);
    setOpen(true);
    setMessage(null);
  };

  const change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "totalPiezasAprobadas" || name === "revisionProduccionId"
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
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.titleGroup}>
          <h1 style={s.title}>Lote de producción</h1>
        </div>
        <button
          style={s.btnPrimary}
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          + Nuevo lote
        </button>
      </div>

      {message && <div style={s.error}>{message}</div>}

      {open && (
        <div style={s.card}>
          <h2 style={s.subtitle}>{editId ? "Editar" : "Nuevo"} lote</h2>
          <form onSubmit={submit}>
            <div style={s.grid}>
              <label style={s.label}>
                Número de lote *
                <input
                  name="numeroLote"
                  value={form.numeroLote}
                  onChange={change}
                  required
                  style={s.input}
                />
              </label>
              <label style={s.label}>
                Total piezas aprobadas *
                <input
                  name="totalPiezasAprobadas"
                  type="number"
                  value={form.totalPiezasAprobadas}
                  onChange={change}
                  required
                  style={s.input}
                />
              </label>
              <label style={s.label}>
                Fecha envío *
                <input
                  name="fechaEnvio"
                  type="date"
                  value={form.fechaEnvio}
                  onChange={change}
                  required
                  style={s.input}
                />
              </label>
              <label style={s.label}>
                Estado
                <select
                  name="estado"
                  value={form.estado}
                  onChange={change}
                  style={s.input}
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </label>
              <label style={s.label}>
                Revisión producción ID
                <input
                  name="revisionProduccionId"
                  type="number"
                  value={form.revisionProduccionId}
                  onChange={change}
                  style={s.input}
                />
              </label>
            </div>
            <div style={s.row}>
              <button type="submit" style={s.btnPrimary}>
                {create.isPending || update.isPending
                  ? "Guardando..."
                  : "Guardar"}
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
                  {[
                    "ID",
                    "Lote",
                    "Piezas aprobadas",
                    "Fecha envío",
                    "Estado",
                    "Revisión ID",
                    "Acciones",
                  ].map((h) => (
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
                    <td style={s.td}>{item.numeroLote}</td>
                    <td style={s.td}>{item.totalPiezasAprobadas}</td>
                    <td style={s.td}>{item.fechaEnvio?.slice(0, 10) ?? "-"}</td>
                    <td style={s.td}>
                      <span
                        style={item.estado === "ACTIVO" ? s.activo : s.inactivo}
                      >
                        {item.estado}
                      </span>
                    </td>
                    <td style={s.td}>{item.revisionProduccionId ?? "-"}</td>
                    <td style={{ ...s.td, ...s.actionCell }}>
                      <button style={s.btnEdit} onClick={() => edit(item)}>
                        Editar
                      </button>
                      <button
                        style={s.btnDelete}
                        onClick={() => remove.mutate(item.id)}
                      >
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
  );
}

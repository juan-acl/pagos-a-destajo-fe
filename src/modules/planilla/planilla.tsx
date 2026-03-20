import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import api from "@/api";
import DataTable from "@/components/commons/DataTable";

type LoteProduccion = {
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

type Planilla = {
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

type PlanillaForm = Omit<Planilla, "id">;

const empty: PlanillaForm = {
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

const fetcher = () =>
  api.get<{ data: Planilla[] }>("/planilla").then((r) => r.data.data);

const fetcher2 = () =>
  api
    .get<{ data: LoteProduccion[] }>("/production-lot")
    .then((r) => r.data.data);

export default function Planilla() {
  const qc = useQueryClient();
  const [form, setForm] = useState<PlanillaForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["planilla"],
    queryFn: fetcher,
  });

  const { data: dataLotes = [] } = useQuery({
    queryKey: ["production-lot"],
    queryFn: fetcher2,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["planilla"] });
    reset();
  };
  const create = useMutation({
    mutationFn: (d: PlanillaForm) => api.post("/planilla", d),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (d: PlanillaForm) => api.put(`/planilla/${editId}`, d),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/planilla/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planilla"] }),
  });

  const reset = () => {
    setForm({ ...empty, loteProduccion: null });
    setEditId(null);
    setOpen(false);
  };
  const edit = (p: Planilla) => {
    setForm({
      loteProduccion: p.loteProduccion ?? null,
      loteProduccionId: p.loteProduccion?.id ?? 0,
      numeroPago: p.numeroPago,
      montoTotal: p.montoTotal,
      descripcion: p.descripcion ?? "",
      metodoPago: p.metodoPago,
      estado: p.estado,
    });
    setEditId(p.id);
    setOpen(true);
  };
  const numericFields = new Set([
    "loteProduccionId",
    "numeroPago",
    "montoTotal",
  ]);

  useEffect(() => {
    console.log("form", form);
  }, [form]);

  const change = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) =>
    setForm((p) => ({
      ...p,
      [e.target.name]:
        e.target.type === "number" || numericFields.has(e.target.name)
          ? Number(e.target.value)
          : e.target.value,
    }));
  const submit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editId) {
      update.mutate(form);
    } else {
      create.mutate(form);
    }
  };

  const columns: ColumnDef<Planilla, unknown>[] = [
    { accessorKey: "numeroPago", header: "N° Pago" },
    {
      accessorKey: "loteProduccion.id",
      header: "Lote Producción",
      cell: (info) => `Revisión#${info.getValue()}`,
    },
    {
      accessorKey: "montoTotal",
      header: "Monto Total",
      cell: (info) => `Q ${(info.getValue() as number).toFixed(2)}`,
    },
    { accessorKey: "metodoPago", header: "Método Pago" },
    {
      accessorKey: "descripcion",
      header: "Descripción",
      cell: (info) => (info.getValue() as string) || "-",
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: (info) => {
        const val = info.getValue() as string;
        return (
          <span style={val === "PAGADO" ? s.activo : s.inactivo}>{val}</span>
        );
      },
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      cell: ({ row }) => (
        <>
          <button style={s.btnEdit} onClick={() => edit(row.original)}>
            Editar
          </button>
          <button
            style={s.btnDelete}
            onClick={() => remove.mutate(row.original.id)}
          >
            Eliminar
          </button>
        </>
      ),
    },
  ];

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Planillas</h1>
        <button
          style={s.btnPrimary}
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          + Nuevo
        </button>
      </div>

      {open && (
        <div style={s.card}>
          <h2 style={s.subtitle}>{editId ? "Editar" : "Nueva"} planilla</h2>
          <form onSubmit={submit}>
            <div style={s.grid}>
              <label style={s.label}>
                Lote de producción *
                <select
                  name="loteProduccionId"
                  value={form.loteProduccionId}
                  onChange={change}
                  required
                  style={s.input}
                >
                  <option value={0} defaultChecked>
                    Seleccionar lote...
                  </option>
                  {dataLotes.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      Revisión#{lote.revisionProduccionId} -{" "}
                      {lote.totalPiezasAprobadas} piezas aprobadas
                    </option>
                  ))}
                </select>
              </label>
              <label style={s.label}>
                Número de pago *
                <input
                  name="numeroPago"
                  type="number"
                  min={1}
                  value={form.numeroPago}
                  onChange={change}
                  required
                  style={s.input}
                />
              </label>
              <label style={s.label}>
                Monto total *
                <input
                  name="montoTotal"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.montoTotal}
                  onChange={change}
                  required
                  style={s.input}
                />
              </label>
              <label style={s.label}>
                Método de pago *
                <select
                  name="metodoPago"
                  value={form.metodoPago}
                  onChange={change}
                  required
                  style={s.input}
                >
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="CHEQUE">CHEQUE</option>
                </select>
              </label>
              <label style={s.label}>
                Estado
                <select
                  name="estado"
                  value={form.estado}
                  onChange={change}
                  style={s.input}
                >
                  <option value="PAGADO" defaultChecked>
                    PAGADO
                  </option>
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                Descripción
                <textarea
                  name="descripcion"
                  value={form.descripcion ?? ""}
                  onChange={change}
                  rows={3}
                  style={{ ...s.input, resize: "vertical" }}
                />
              </label>
            </div>
            <div style={s.row}>
              <button type="submit" style={s.btnPrimary}>
                Guardar
              </button>
              <button type="button" style={s.btnSecondary} onClick={reset}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={s.card}>
        <DataTable columns={columns} data={data} isLoading={isLoading} />
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { padding: "24px", maxWidth: "1100px", margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: { fontSize: "22px", fontWeight: 600, margin: 0 },
  subtitle: { fontSize: "16px", fontWeight: 500, marginBottom: "16px" },
  card: {
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    padding: "24px",
    marginBottom: "20px",
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  row: { display: "flex", gap: "8px", marginTop: "16px" },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "13px",
    fontWeight: 500,
  },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    padding: "7px 10px",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  btnPrimary: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
  },
  btnSecondary: {
    background: "#f1f5f9",
    color: "#333",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
  },
  btnEdit: {
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: "13px",
    marginRight: "6px",
  },
  btnDelete: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: "13px",
  },
  activo: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "999px",
    padding: "2px 10px",
    fontSize: "12px",
  },
  inactivo: {
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: "999px",
    padding: "2px 10px",
    fontSize: "12px",
  },
};

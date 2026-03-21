import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import api from "@/api";
import DataTable from "@/components/commons/DataTable";

type Puesto = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  estado: string;
};

type PuestoForm = Omit<Puesto, "id">;

const empty: PuestoForm = {
  nombre: "",
  descripcion: "",
  estado: "ACTIVO",
};

const fetcher = () =>
  api.get<{ data: Puesto[] }>("/position-workers").then((r) => r.data.data);

export default function Puesto() {
  const qc = useQueryClient();
  const [form, setForm] = useState<PuestoForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["position-workers"],
    queryFn: fetcher,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["position-workers"] });
    reset();
  };
  const create = useMutation({
    mutationFn: (d: PuestoForm) => api.post("/position-workers", d),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (d: PuestoForm) => api.put(`/position-workers/${editId}`, d),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/position-workers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["position-workers"] }),
  });

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setOpen(false);
  };
  const edit = (p: Puesto) => {
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      estado: p.estado,
    });
    setEditId(p.id);
    setOpen(true);
  };
  const change = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      update.mutate(form);
    } else {
      create.mutate(form);
    }
  };

  const columns: ColumnDef<Puesto, unknown>[] = [
    { accessorKey: "nombre", header: "Nombre" },
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
          <span style={val === "ACTIVO" ? s.activo : s.inactivo}>{val}</span>
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
        <h1 style={s.title}>Puestos</h1>
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
          <h2 style={s.subtitle}>{editId ? "Editar" : "Nuevo"} puesto</h2>
          <form onSubmit={submit}>
            <div style={s.grid}>
              <label style={s.label}>
                Nombre *
                <input
                  name="nombre"
                  value={form.nombre}
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

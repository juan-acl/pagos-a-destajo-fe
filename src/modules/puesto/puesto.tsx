import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import api from "@/api";
import DataTable from "@/components/commons/DataTable";
import { s } from "@/styles/puesto.styles";
import { empty, type Puesto, type PuestoForm } from "@/types/puesto.types";
import { fetchPuestos } from "@/api/puesto.api";
import Modal from "@/components/ui/Modal";

export default function Puesto() {
  const qc = useQueryClient();
  const [form, setForm] = useState<PuestoForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["position-workers"],
    queryFn: fetchPuestos,
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
  const submit = (e: React.SyntheticEvent<HTMLFormElement>) => {
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
          <button style={s.btnIcon} onClick={() => edit(row.original)}>
            ✏️
          </button>
          <button
            style={s.btnIcon}
            onClick={() => remove.mutate(row.original.id)}
          >
            🗑️
          </button>
        </>
      ),
    },
  ];

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Puestos</h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
            Defina y gestione los puestos de trabajo disponibles en la organización.
          </p>
        </div>
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

      <div style={s.card}>
        <DataTable columns={columns} data={data} isLoading={isLoading} />
      </div>

      <Modal
        open={open}
        title={editId ? "Editar Puesto" : "Nuevo Puesto"}
        subtitle="Complete la información para registrar el puesto de trabajo."
        onClose={reset}
      >
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
      </Modal>
    </div>
  );
}

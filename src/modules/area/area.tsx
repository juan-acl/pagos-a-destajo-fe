import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import api from "@/api";
import DataTable from "@/components/commons/DataTable";
import { empty, type Area, type AreaForm } from "@/types/area.types";
import { fetchAreas } from "@/api/area.api";
import { s } from "@/styles/area.styles";
import Modal from "@/components/ui/Modal";

export default function Area() {
  const qc = useQueryClient();
  const [form, setForm] = useState<AreaForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["area"],
    queryFn: fetchAreas,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["area"] });
    reset();
  };
  const create = useMutation({
    mutationFn: (d: AreaForm) => api.post("/area", d),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (d: AreaForm) => api.put(`/area/${editId}`, d),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/area/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["area"] }),
  });

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setOpen(false);
  };
  const edit = (a: Area) => {
    setForm({
      nombre: a.nombre,
      codigoArea: a.codigoArea ?? "",
      estado: a.estado,
    });
    setEditId(a.id);
    setOpen(true);
  };
  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editId) {
      update.mutate(form);
    } else {
      create.mutate(form);
    }
  };

  const columns: ColumnDef<Area, unknown>[] = [
    {
      accessorKey: "codigoArea",
      header: "Código",
      cell: (info) => (info.getValue() as string) ?? "-",
    },
    { accessorKey: "nombre", header: "Nombre" },
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
          <h1 style={s.title}>Áreas</h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
            Organice y gestione las áreas de producción y su estado operativo.
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
        title={editId ? "Editar Área" : "Nuevo Área"}
        subtitle="Complete la información para registrar el área."
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
              Código área
              <input
                name="codigoArea"
                value={form.codigoArea ?? ""}
                onChange={change}
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

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import api from "@/api";
import DataTable from "@/components/commons/DataTable";
import { s } from "@/styles/planilla.styles";
import {
  empty,
  type Planilla,
  type PlanillaForm,
} from "@/types/planilla.types";
import { fetchLotesProduccion, fetchPlanillas } from "@/api/planilla.api";
import Modal from "@/components/ui/Modal";

export default function Planilla() {
  const qc = useQueryClient();
  const [form, setForm] = useState<PlanillaForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["planilla"],
    queryFn: fetchPlanillas,
  });

  const { data: dataLotes = [] } = useQuery({
    queryKey: ["production-lot"],
    queryFn: fetchLotesProduccion,
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
          <h1 style={s.title}>Planillas</h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
            Administre las planillas de pago vinculadas a los lotes de producción.
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
        title={editId ? "Editar Planilla" : "Nueva Planilla"}
        subtitle="Complete la información para registrar la planilla de pago."
        onClose={reset}
      >
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
      </Modal>
    </div>
  );
}

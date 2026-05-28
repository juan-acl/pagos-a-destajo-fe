import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Ruler, Plus, HelpCircle, Pencil, Trash2 } from "lucide-react";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/commons/DataTable";
import Stats from "@/components/commons/stats";
import { useFilter } from "@/hooks/useFilter";
import { useTour } from "@/hooks/useTour";
import { useAuthStore } from "@/store/authStore";
import { medidasStats } from "@/constants/medidas.constants";
import { MEDIDAS_TOUR_STEPS } from "./tour";
import { s } from "@/styles/planilla.styles";

const ITEMS_PER_PAGE = 10;

type Medida = { id: number; nombre: string; iniciales: string; };
type MedidaForm = Omit<Medida, "id">;
const empty: MedidaForm = { nombre: "", iniciales: "" };

const fetcher = () => api.get<{ data: Medida[] }>("/medidas").then(r => r.data.data);

export default function Medidas() {
  const qc = useQueryClient();
  const { empleado } = useAuthStore();
  const [form, setForm] = useState<MedidaForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { startTour } = useTour(MEDIDAS_TOUR_STEPS, "medidas", empleado?.id);
  const { data = [], isLoading } = useQuery({ queryKey: ["medidas"], queryFn: fetcher });
  const { filteredData, setSearch, search } = useFilter({ data, filterableFields: ["nombre", "iniciales"] });

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginated = useMemo(
    () => filteredData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filteredData, page],
  );

  const stats = useMemo(() =>
    medidasStats.map(stat => {
      if (stat.label === "Total") return { ...stat, value: data.length };
      if (stat.label === "Registradas") return { ...stat, value: data.length };
      return stat;
    }), [data]);

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["medidas"] }); reset(); };
  const create = useMutation({
    mutationFn: (d: MedidaForm) => api.post("/medidas", d),
    onSuccess: invalidate,
    onError: (e: any) => setErrorMsg(e?.response?.data?.message ?? "Error al guardar la medida."),
  });
  const update = useMutation({
    mutationFn: (d: MedidaForm) => api.put(`/medidas/${editId}`, d),
    onSuccess: invalidate,
    onError: (e: any) => setErrorMsg(e?.response?.data?.message ?? "Error al actualizar la medida."),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/medidas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medidas"] }),
    onError: (e: any) => setErrorMsg(e?.response?.data?.message ?? "Error al eliminar la medida."),
  });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); setErrorMsg(null); };
  const edit = (m: Medida) => { setForm({ nombre: m.nombre, iniciales: m.iniciales }); setEditId(m.id); setOpen(true); setErrorMsg(null); };
  const change = (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!form.nombre.trim()) { setErrorMsg("El nombre es obligatorio."); return; }
    if (!form.iniciales.trim()) { setErrorMsg("Las iniciales son obligatorias."); return; }
    editId ? update.mutate(form) : create.mutate(form);
  };

  const columns: ColumnDef<Medida, unknown>[] = [
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: info => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>📏</span>
          <span className="font-medium text-gray-900">{info.getValue() as string}</span>
        </div>
      ),
    },
    {
      accessorKey: "iniciales",
      header: "Iniciales",
      cell: info => <Badge label={info.getValue() as string} color="blue" />,
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      cell: ({ row }) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            style={{ ...s.btnIcon, display: "flex", alignItems: "center", gap: "4px" }}
            title="Editar medida"
            onClick={() => edit(row.original)}
          >
            <Pencil size={14} color="#2D6A4F" />
          </button>
          <button
            style={{ ...s.btnIcon, background: "#fee2e2", display: "flex", alignItems: "center", gap: "4px" }}
            title="Eliminar medida"
            onClick={() => remove.mutate(row.original.id)}
          >
            <Trash2 size={14} color="#dc2626" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div style={s.header}>
        <div id="medidas-title" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "10px", display: "flex" }}>
            <Ruler size={22} color="#2D6A4F" />
          </div>
          <div>
            <h1 style={s.title}>Medidas</h1>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
              Gestión de unidades de medida utilizadas en las órdenes de producción.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button id="medidas-ayuda-btn" style={{ ...s.btnHelp, display: "flex", alignItems: "center", gap: "6px" }} onClick={startTour}>
            <HelpCircle size={15} color="#2D6A4F" />
            ¿Necesitas ayuda?
          </button>
          <button id="medidas-nuevo-btn" style={{ ...s.btnPrimary, display: "flex", alignItems: "center", gap: "6px" }} onClick={() => { reset(); setOpen(true); }}>
            <Plus size={16} />
            Nueva Medida
          </button>
        </div>
      </div>

      <div id="medidas-stats"><Stats data={stats} /></div>

      <div id="medidas-filtros" className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          placeholder="🔍 Buscar por nombre o iniciales..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 min-w-0"
        />
      </div>

      <div id="medidas-tabla" style={s.card}>
        <DataTable
          columns={columns}
          data={paginated}
          isLoading={isLoading}
          page={page}
          totalPages={totalPages}
          totalItems={filteredData.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setPage}
          entityLabel="medidas"
        />
      </div>

      <Modal open={open} title={editId ? "✏️ Editar Medida" : "📏 Nueva Medida"} subtitle="Complete la información de la unidad de medida." onClose={reset}>
        {errorMsg && <div style={s.error}>⚠️ {errorMsg}</div>}
        <form onSubmit={submit}>
          <div style={s.grid}>
            <label style={s.label}>
              Nombre *
              <input name="nombre" value={form.nombre} onChange={change} required placeholder="Ej. Kilogramo" style={s.input} />
            </label>
            <label style={s.label}>
              Iniciales *
              <input name="iniciales" value={form.iniciales} onChange={change} required placeholder="Ej. kg" style={s.input} />
            </label>
          </div>
          <div style={s.row}>
            <button type="submit" style={{ ...s.btnPrimary, display: "flex", alignItems: "center", gap: "6px" }} disabled={create.isPending || update.isPending}>
              {editId ? <><Pencil size={14} /> Actualizar Medida</> : <><Plus size={14} /> Guardar Medida</>}
            </button>
            <button type="button" style={s.btnSecondary} onClick={reset}>Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

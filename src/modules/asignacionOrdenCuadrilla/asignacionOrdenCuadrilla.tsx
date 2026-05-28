import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { GitMerge, Plus, HelpCircle, Pencil, Trash2 } from "lucide-react";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/commons/DataTable";
import Stats from "@/components/commons/stats";
import Filters from "@/components/commons/filters";
import { useFilter } from "@/hooks/useFilter";
import { useTour } from "@/hooks/useTour";
import { useAuthStore } from "@/store/authStore";
import { asignacionOrdenStats } from "@/constants/asignacionOrden.constants";
import { ASIGNACION_ORDEN_TOUR_STEPS } from "./tour";
import { s } from "@/styles/planilla.styles";

const ITEMS_PER_PAGE = 10;

type OrdenTrabajo = { id: number; numeroOrden: string; cantidadRequerida: number; };
type Cuadrilla = { id: number; nombre: string; };
type AsignacionOrdenCuadrilla = {
  id: number; ordenTrabajoId: number; cuadrillaId: number;
  cantidadAsignada: number; estado: string;
};
type AsignacionForm = Omit<AsignacionOrdenCuadrilla, "id">;

const empty: AsignacionForm = { ordenTrabajoId: 0, cuadrillaId: 0, cantidadAsignada: 0, estado: "activo" };

const fetcherAsignaciones = () => api.get<{ data: AsignacionOrdenCuadrilla[] }>("/asignaciones-orden-cuadrilla").then(r => r.data.data);
const fetcherOrdenes = () => api.get<{ data: OrdenTrabajo[] }>("/ordenes-trabajo").then(r => r.data.data);
const fetcherCuadrillas = () => api.get<{ data: Cuadrilla[] }>("/cuadrillas").then(r => r.data.data);

export default function AsignacionOrdenCuadrilla() {
  const qc = useQueryClient();
  const { empleado } = useAuthStore();
  const [form, setForm] = useState<AsignacionForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { startTour } = useTour(ASIGNACION_ORDEN_TOUR_STEPS, "asignacion-orden", empleado?.id);
  const { data = [], isLoading } = useQuery({ queryKey: ["asignaciones-orden-cuadrilla"], queryFn: fetcherAsignaciones });
  const { data: ordenes = [] } = useQuery({ queryKey: ["ordenes-trabajo"], queryFn: fetcherOrdenes });
  const { data: cuadrillas = [] } = useQuery({ queryKey: ["cuadrillas"], queryFn: fetcherCuadrillas });

  const enriched = useMemo(() => data.map(a => ({
    ...a,
    numeroOrden: ordenes.find(o => o.id === a.ordenTrabajoId)?.numeroOrden ?? "-",
    nombreCuadrilla: cuadrillas.find(c => c.id === a.cuadrillaId)?.nombre ?? "-",
  })), [data, ordenes, cuadrillas]);

  const { filteredData, setSearch, search, setFilter, activeFilters } = useFilter({
    data: enriched,
    filterableFields: ["numeroOrden", "nombreCuadrilla", "estado"],
    exactMatchFields: ["estado"],
  });

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginated = useMemo(
    () => filteredData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filteredData, page],
  );

  const stats = useMemo(() =>
    asignacionOrdenStats.map(stat => {
      if (stat.label === "Total") return { ...stat, value: data.length };
      if (stat.label === "Activas") return { ...stat, value: data.filter(a => a.estado === "activo").length };
      if (stat.label === "Inactivas") return { ...stat, value: data.filter(a => a.estado === "inactivo").length };
      return stat;
    }), [data]);

  const optionsEstado = useMemo(() => {
    const seen = new Set<string>();
    return data.reduce<{ id: number; nombre: string }[]>((acc, a) => {
      if (!seen.has(a.estado)) { seen.add(a.estado); acc.push({ id: acc.length + 1, nombre: a.estado }); }
      return acc;
    }, []);
  }, [data]);

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["asignaciones-orden-cuadrilla"] }); reset(); };
  const create = useMutation({
    mutationFn: (d: AsignacionForm) => api.post("/asignaciones-orden-cuadrilla", d),
    onSuccess: invalidate,
    onError: (e: any) => setErrorMsg(e?.response?.data?.message ?? "Error al guardar la asignación."),
  });
  const update = useMutation({
    mutationFn: (d: AsignacionForm) => api.put(`/asignaciones-orden-cuadrilla/${editId}`, d),
    onSuccess: invalidate,
    onError: (e: any) => setErrorMsg(e?.response?.data?.message ?? "Error al actualizar la asignación."),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/asignaciones-orden-cuadrilla/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["asignaciones-orden-cuadrilla"] }),
    onError: (e: any) => setErrorMsg(e?.response?.data?.message ?? "Error al eliminar la asignación."),
  });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); setErrorMsg(null); };
  const edit = (a: AsignacionOrdenCuadrilla) => {
    const orden = ordenes.find(o => o.id === a.ordenTrabajoId);
    setForm({ ordenTrabajoId: a.ordenTrabajoId, cuadrillaId: a.cuadrillaId, cantidadAsignada: orden?.cantidadRequerida ?? a.cantidadAsignada, estado: a.estado });
    setEditId(a.id); setOpen(true); setErrorMsg(null);
  };
  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "ordenTrabajoId") {
      const ordenId = Number(value);
      const orden = ordenes.find(o => o.id === ordenId);
      setForm(p => ({ ...p, ordenTrabajoId: ordenId, cantidadAsignada: orden?.cantidadRequerida ?? 0 }));
      return;
    }
    setForm(p => ({ ...p, [name]: name === "cuadrillaId" ? Number(value) : value }));
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };

  const columns: ColumnDef<typeof enriched[0], unknown>[] = [
    {
      accessorKey: "numeroOrden",
      header: "Orden de trabajo",
      cell: info => (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "14px" }}>📋</span>
          <span className="font-mono text-xs font-semibold text-gray-500">{info.getValue() as string}</span>
        </div>
      ),
    },
    {
      accessorKey: "nombreCuadrilla",
      header: "Cuadrilla",
      cell: info => (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "14px" }}>👥</span>
          <span className="font-medium text-gray-900">{info.getValue() as string}</span>
        </div>
      ),
    },
    {
      accessorKey: "cantidadAsignada",
      header: "Cantidad asignada",
      cell: info => (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "14px" }}>🔢</span>
          <span className="font-medium text-gray-900">{info.getValue() as number}</span>
        </div>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: info => <Badge label={(info.getValue() as string).toUpperCase()} color={info.getValue() === "activo" ? "green" : "gray"} />,
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      cell: ({ row }) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={{ ...s.btnIcon, display: "flex", alignItems: "center", gap: "4px" }} title="Editar asignación" onClick={() => edit(row.original)}>
            <Pencil size={14} color="#2D6A4F" />
          </button>
          <button style={{ ...s.btnIcon, background: "#fee2e2", display: "flex", alignItems: "center", gap: "4px" }} title="Eliminar asignación" onClick={() => remove.mutate(row.original.id)}>
            <Trash2 size={14} color="#dc2626" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div style={s.header}>
        <div id="asignacion-title" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "10px", display: "flex" }}>
            <GitMerge size={22} color="#2D6A4F" />
          </div>
          <div>
            <h1 style={s.title}>Asignación de Orden a Cuadrilla</h1>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
              Distribución de órdenes de trabajo entre cuadrillas de producción.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button id="asignacion-ayuda-btn" style={{ ...s.btnHelp, display: "flex", alignItems: "center", gap: "6px" }} onClick={startTour}>
            <HelpCircle size={15} color="#2D6A4F" />
            ¿Necesitas ayuda?
          </button>
          <button id="asignacion-nuevo-btn" style={{ ...s.btnPrimary, display: "flex", alignItems: "center", gap: "6px" }} onClick={() => { reset(); setOpen(true); }}>
            <Plus size={16} />
            Nueva Asignación
          </button>
        </div>
      </div>

      <div id="asignacion-stats"><Stats data={stats} /></div>

      <div id="asignacion-filtros">
        <Filters
          search={search}
          setSearch={val => { setSearch(val); setPage(1); }}
          filterValue="" setFilterValue={() => {}}
          filterEstado={(activeFilters.estado as string) ?? ""}
          setFilterEstado={val => { setFilter("estado", val); setPage(1); }}
          options2={optionsEstado}
          placeholder="🔍 Buscar por orden o cuadrilla..."
          label1="Asignación" label2="Estado"
        />
      </div>

      <div id="asignacion-tabla" style={s.card}>
        <DataTable
          columns={columns} data={paginated} isLoading={isLoading}
          page={page} totalPages={totalPages} totalItems={filteredData.length}
          itemsPerPage={ITEMS_PER_PAGE} onPageChange={setPage} entityLabel="asignaciones"
        />
      </div>

      <Modal open={open} title={editId ? "✏️ Editar Asignación" : "🔗 Nueva Asignación"} subtitle="Asigne una orden de trabajo a una cuadrilla de producción." onClose={reset}>
        {errorMsg && <div style={s.error}>⚠️ {errorMsg}</div>}
        <form onSubmit={submit}>
          <div style={s.grid}>
            <label style={s.label}>
              Orden de trabajo *
              <select name="ordenTrabajoId" value={form.ordenTrabajoId} onChange={change} required style={s.input}>
                <option value={0}>📋 Seleccionar orden</option>
                {ordenes.map(o => <option key={o.id} value={o.id}>Orden - {o.numeroOrden}</option>)}
              </select>
            </label>
            <label style={s.label}>
              Cuadrilla *
              <select name="cuadrillaId" value={form.cuadrillaId} onChange={change} required style={s.input}>
                <option value={0}>👥 Seleccionar cuadrilla</option>
                {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <label style={s.label}>
              Cantidad asignada
              <input name="cantidadAsignada" type="number" value={form.cantidadAsignada} readOnly style={s.inputReadonly} />
            </label>
            <label style={s.label}>
              Estado
              <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                {["activo", "inactivo"].map(est => (
                  <label key={est} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                    <input type="radio" name="estado" value={est} checked={form.estado === est} onChange={change} />
                    {est === "activo" ? "✅ Activo" : "⛔ Inactivo"}
                  </label>
                ))}
              </div>
            </label>
          </div>
          <div style={s.row}>
            <button type="submit" style={{ ...s.btnPrimary, display: "flex", alignItems: "center", gap: "6px" }} disabled={create.isPending || update.isPending}>
              {editId ? <><Pencil size={14} /> Actualizar Asignación</> : <><Plus size={14} /> Guardar Asignación</>}
            </button>
            <button type="button" style={s.btnSecondary} onClick={reset}>Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

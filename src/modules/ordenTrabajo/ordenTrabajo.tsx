import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { ClipboardCheck, Plus, HelpCircle, Pencil, Trash2, Calendar, DollarSign } from "lucide-react";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/commons/DataTable";
import Stats from "@/components/commons/stats";
import Filters from "@/components/commons/filters";
import { useFilter } from "@/hooks/useFilter";
import { useTour } from "@/hooks/useTour";
import { useAuthStore } from "@/store/authStore";
import { ordenTrabajoStats } from "@/constants/ordenTrabajo.constants";
import { ORDEN_TRABAJO_TOUR_STEPS } from "./tour";
import { s } from "@/styles/planilla.styles";

const ITEMS_PER_PAGE = 10;

type Medida = { id: number; nombre: string; iniciales: string; };
type Modalidad = "DESTAJO" | "PAGO_POR_DIAS";
type OrdenTrabajo = {
  id: number; numeroOrden: string; cantidadRequerida: number;
  medidaId?: number | null; pagoUnitario: number;
  fechaLimite?: string | null; estado: string; modalidad: Modalidad;
};
type OrdenTrabajoForm = Omit<OrdenTrabajo, "id" | "numeroOrden">;

const empty: OrdenTrabajoForm = {
  cantidadRequerida: 0, medidaId: null,
  pagoUnitario: 0, fechaLimite: "", estado: "activo", modalidad: "DESTAJO",
};

const fetcherOrdenes = () => api.get<{ data: OrdenTrabajo[] }>("/ordenes-trabajo").then(r => r.data.data);
const fetcherMedidas = () => api.get<{ data: Medida[] }>("/medidas").then(r => r.data.data);

export default function OrdenTrabajo() {
  const qc = useQueryClient();
  const { empleado } = useAuthStore();
  const [form, setForm] = useState<OrdenTrabajoForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { startTour } = useTour(ORDEN_TRABAJO_TOUR_STEPS, "ordenes-trabajo", empleado?.id);
  const { data = [], isLoading } = useQuery({ queryKey: ["ordenes-trabajo"], queryFn: fetcherOrdenes });
  const { data: medidas = [] } = useQuery({ queryKey: ["medidas"], queryFn: fetcherMedidas });

  const { filteredData, setSearch, search, setFilter, activeFilters } = useFilter({
    data, filterableFields: ["numeroOrden", "estado"], exactMatchFields: ["estado"],
  });

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginated = useMemo(
    () => filteredData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filteredData, page],
  );

  const stats = useMemo(() =>
    ordenTrabajoStats.map(stat => {
      if (stat.label === "Total") return { ...stat, value: data.length };
      if (stat.label === "Activas") return { ...stat, value: data.filter(o => o.estado === "activo").length };
      if (stat.label === "Inactivas") return { ...stat, value: data.filter(o => o.estado === "inactivo").length };
      return stat;
    }), [data]);

  const optionsEstado = useMemo(() => {
    const seen = new Set<string>();
    return data.reduce<{ id: number; nombre: string }[]>((acc, o) => {
      if (!seen.has(o.estado)) { seen.add(o.estado); acc.push({ id: acc.length + 1, nombre: o.estado }); }
      return acc;
    }, []);
  }, [data]);

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["ordenes-trabajo"] }); reset(); };
  const create = useMutation({
    mutationFn: (d: OrdenTrabajoForm) => api.post("/ordenes-trabajo", d),
    onSuccess: invalidate,
    onError: (e: any) => setErrorMsg(e?.response?.data?.message ?? "Error al guardar la orden."),
  });
  const update = useMutation({
    mutationFn: (d: OrdenTrabajoForm) => api.put(`/ordenes-trabajo/${editId}`, d),
    onSuccess: invalidate,
    onError: (e: any) => setErrorMsg(e?.response?.data?.message ?? "Error al actualizar la orden."),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/ordenes-trabajo/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordenes-trabajo"] }),
    onError: (e: any) => setErrorMsg(e?.response?.data?.message ?? "Error al eliminar la orden."),
  });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); setErrorMsg(null); };
  const edit = (o: OrdenTrabajo) => {
    setForm({ cantidadRequerida: o.cantidadRequerida, medidaId: o.medidaId ?? null, pagoUnitario: o.pagoUnitario, fechaLimite: o.fechaLimite ?? "", estado: o.estado, modalidad: o.modalidad ?? "DESTAJO" });
    setEditId(o.id); setOpen(true); setErrorMsg(null);
  };
  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: name === "cantidadRequerida" || name === "pagoUnitario" || name === "medidaId" ? value === "" ? null : Number(value) : value }));
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(null);
    if (!form.cantidadRequerida || form.cantidadRequerida <= 0) { setErrorMsg("La cantidad requerida debe ser mayor a cero."); return; }
    if (!form.pagoUnitario || form.pagoUnitario <= 0) { setErrorMsg("El pago unitario debe ser mayor a cero."); return; }
    editId ? update.mutate(form) : create.mutate(form);
  };

  const getMedidaNombre = (id?: number | null) => medidas.find(m => m.id === id)?.nombre ?? "-";

  const columns: ColumnDef<OrdenTrabajo, unknown>[] = [
    {
      accessorKey: "numeroOrden",
      header: "N° Orden",
      cell: info => (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ClipboardCheck size={14} color="#2D6A4F" />
          <span className="font-mono text-xs font-semibold text-gray-500">{info.getValue() as string}</span>
        </div>
      ),
    },
    {
      accessorKey: "cantidadRequerida",
      header: "Cantidad",
      cell: info => <span className="font-medium text-gray-900">{info.getValue() as number}</span>,
    },
    {
      accessorKey: "medidaId",
      header: "Medida",
      cell: info => <Badge label={getMedidaNombre(info.getValue() as number | null)} color="blue" />,
    },
    {
      accessorKey: "modalidad",
      header: "Modalidad",
      cell: info => {
        const m = info.getValue() as Modalidad;
        return <Badge label={m === "PAGO_POR_DIAS" ? "📅 Por día" : "🔧 Destajo"} color={m === "PAGO_POR_DIAS" ? "amber" : "green"} />;
      },
    },
    {
      accessorKey: "pagoUnitario",
      header: "Pago unitario",
      cell: ({ row }) => (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <DollarSign size={13} color="#2D6A4F" />
          <span className="font-semibold text-gray-900">
            Q {Number(row.original.pagoUnitario).toFixed(2)}
            <span className="ml-1 text-xs font-normal text-gray-400">
              {row.original.modalidad === "PAGO_POR_DIAS" ? "/día" : "/pieza"}
            </span>
          </span>
        </div>
      ),
    },
    {
      accessorKey: "fechaLimite",
      header: "Fecha límite",
      cell: info => {
        const val = info.getValue() as string | null;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {val && <Calendar size={13} color="#64748b" />}
            <span className="text-gray-500">{val ? new Date(val).toLocaleDateString() : "—"}</span>
          </div>
        );
      },
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
          <button style={{ ...s.btnIcon, display: "flex", alignItems: "center", gap: "4px" }} title="Editar orden" onClick={() => edit(row.original)}>
            <Pencil size={14} color="#2D6A4F" />
          </button>
          <button style={{ ...s.btnIcon, background: "#fee2e2", display: "flex", alignItems: "center", gap: "4px" }} title="Eliminar orden" onClick={() => remove.mutate(row.original.id)}>
            <Trash2 size={14} color="#dc2626" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div style={s.header}>
        <div id="ordenes-title" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "10px", display: "flex" }}>
            <ClipboardCheck size={22} color="#2D6A4F" />
          </div>
          <div>
            <h1 style={s.title}>Órdenes de Trabajo</h1>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
              Creación y seguimiento de órdenes de producción.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button id="ordenes-ayuda-btn" style={{ ...s.btnHelp, display: "flex", alignItems: "center", gap: "6px" }} onClick={startTour}>
            <HelpCircle size={15} color="#2D6A4F" />
            ¿Necesitas ayuda?
          </button>
          <button id="ordenes-nuevo-btn" style={{ ...s.btnPrimary, display: "flex", alignItems: "center", gap: "6px" }} onClick={() => { reset(); setOpen(true); }}>
            <Plus size={16} />
            Nueva Orden
          </button>
        </div>
      </div>

      <div id="ordenes-stats"><Stats data={stats} /></div>

      <div id="ordenes-filtros">
        <Filters
          search={search}
          setSearch={val => { setSearch(val); setPage(1); }}
          filterValue="" setFilterValue={() => {}}
          filterEstado={(activeFilters.estado as string) ?? ""}
          setFilterEstado={val => { setFilter("estado", val); setPage(1); }}
          options2={optionsEstado}
          placeholder="🔍 Buscar por número de orden..."
          label1="Orden" label2="Estado"
        />
      </div>

      <div id="ordenes-tabla" style={s.card}>
        <DataTable
          columns={columns} data={paginated} isLoading={isLoading}
          page={page} totalPages={totalPages} totalItems={filteredData.length}
          itemsPerPage={ITEMS_PER_PAGE} onPageChange={setPage} entityLabel="órdenes"
        />
      </div>

      <Modal open={open} title={editId ? "✏️ Editar Orden de Trabajo" : "📋 Nueva Orden de Trabajo"} subtitle="El número de orden se genera automáticamente al guardar." onClose={reset}>
        {errorMsg && <div style={s.error}>⚠️ {errorMsg}</div>}
        <form onSubmit={submit}>
          <div style={s.grid}>
            {editId && (
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                Número de orden
                <input value={data.find(o => o.id === editId)?.numeroOrden ?? ""} readOnly style={s.inputReadonly} />
              </label>
            )}
            <label style={s.label}>
              Cantidad requerida *
              <input name="cantidadRequerida" type="number" value={form.cantidadRequerida} onChange={change} required min={1} placeholder="Ej. 500" style={s.input} />
            </label>
            <label style={s.label}>
              Medida
              <select name="medidaId" value={form.medidaId ?? ""} onChange={change} style={s.input}>
                <option value="">Sin medida</option>
                {medidas.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.iniciales})</option>)}
              </select>
            </label>
            <label style={s.label}>
              Modalidad de pago *
              <select name="modalidad" value={form.modalidad} onChange={change} style={s.input}>
                <option value="DESTAJO">🔧 Destajo (por pieza)</option>
                <option value="PAGO_POR_DIAS">📅 Pago por día</option>
              </select>
            </label>
            <label style={s.label}>
              {form.modalidad === "PAGO_POR_DIAS" ? "Pago por día *" : "Pago unitario (por pieza) *"}
              <input name="pagoUnitario" type="number" value={form.pagoUnitario} onChange={change} required min={0} step="0.01"
                placeholder={form.modalidad === "PAGO_POR_DIAS" ? "Ej. 150.00" : "Ej. 2.50"} style={s.input} />
            </label>
            <label style={s.label}>
              Fecha límite
              <input name="fechaLimite" type="date" value={form.fechaLimite ?? ""} onChange={change} style={s.input} />
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
              {editId ? <><Pencil size={14} /> Actualizar Orden</> : <><Plus size={14} /> Guardar Orden</>}
            </button>
            <button type="button" style={s.btnSecondary} onClick={reset}>Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

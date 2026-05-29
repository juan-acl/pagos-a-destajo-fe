import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitMerge, Plus, HelpCircle, Pencil, Trash2, Search, Users, Hash } from "lucide-react";
import api from "@/api";
import { getErrorMessage } from "@/utils/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import ToastContainer from "@/components/ui/Toastcontainer";
import { useToast } from "@/hooks/useToast";
import { useTour } from "@/hooks/useTour";
import { useTooltip } from "@/hooks/useTooltip";
import { useAuthStore } from "@/store/authStore";
import { validateAsignacionOrden, hasErrors, type Errors } from "@/utils/validators";
import { ASIGNACION_ORDEN_TOUR_STEPS } from "./tour";

const ITEMS_PER_PAGE = 10;

type OrdenTrabajo = { id: number; numeroOrden: string; cantidadRequerida: number; };
type Cuadrilla = { id: number; nombre: string; };
type AsignacionOrdenCuadrilla = {
  id: number; ordenTrabajoId: number; cuadrillaId: number;
  cantidadAsignada: number; estado: string;
};
type AsignacionForm = Omit<AsignacionOrdenCuadrilla, "id">;

const empty: AsignacionForm = { ordenTrabajoId: 0, cuadrillaId: 0, cantidadAsignada: 0, estado: "activo" };

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span style={{ color: "#DC3545", fontSize: "11px", marginTop: "2px" }}>{msg}</span>;
}

function TipIcon({ element, title, description }: { element: string; title: string; description: string }) {
  const { showTooltip } = useTooltip();
  return (
    <button type="button" onClick={() => showTooltip(element, title, description)}
      className="text-gray-400 hover:text-[#2D6A4F] transition-colors bg-transparent border-0 cursor-pointer p-0 text-xs leading-none ml-1">
      ⓘ
    </button>
  );
}

const fetcherAsignaciones = () => api.get<{ data: AsignacionOrdenCuadrilla[] }>("/asignaciones-orden-cuadrilla").then(r => r.data.data);
const fetcherOrdenes = () => api.get<{ data: OrdenTrabajo[] }>("/ordenes-trabajo").then(r => r.data.data);
const fetcherCuadrillas = () => api.get<{ data: Cuadrilla[] }>("/cuadrillas").then(r => r.data.data);

export default function AsignacionOrdenCuadrilla() {
  const qc = useQueryClient();
  const { empleado: authEmpleado } = useAuthStore();
  const [form, setForm] = useState<AsignacionForm>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [page, setPage] = useState(1);

  const { toasts, show, remove } = useToast();
  const { startTour } = useTour(ASIGNACION_ORDEN_TOUR_STEPS, "asignacion-orden", authEmpleado?.id);

  const tourKey = authEmpleado?.id != null ? `pad_tour_asignacion_orden_v1_${authEmpleado.id}` : null;
  const [tourDone, setTourDone] = useState(() => tourKey ? localStorage.getItem(tourKey) === "1" : false);
  useEffect(() => {
    if (!tourKey || tourDone) return;
    const interval = setInterval(() => {
      if (localStorage.getItem(tourKey) === "1") setTourDone(true);
    }, 500);
    return () => clearInterval(interval);
  }, [tourKey, tourDone]);

  const { data = [], isLoading } = useQuery({ queryKey: ["asignaciones-orden-cuadrilla"], queryFn: fetcherAsignaciones });
  const { data: ordenes = [] } = useQuery({ queryKey: ["ordenes-trabajo"], queryFn: fetcherOrdenes });
  const { data: cuadrillas = [] } = useQuery({ queryKey: ["cuadrillas"], queryFn: fetcherCuadrillas });

  const getOrdenNumero = (id: number) => ordenes.find(o => o.id === id)?.numeroOrden ?? "-";
  const getCuadrillaName = (id: number) => cuadrillas.find(c => c.id === id)?.nombre ?? "-";

  const filtered = useMemo(() => data.filter(a => {
    const texto = `${getOrdenNumero(a.ordenTrabajoId)} ${getCuadrillaName(a.cuadrillaId)} ${a.estado}`.toLowerCase();
    return (!search || texto.includes(search.toLowerCase())) && (!filterEstado || a.estado === filterEstado);
  }), [data, search, filterEstado, ordenes, cuadrillas]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filtered, page],
  );

  const activas = data.filter(a => a.estado === "activo").length;
  const inactivas = data.filter(a => a.estado === "inactivo").length;

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); setErrors({}); };
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["asignaciones-orden-cuadrilla"] }); reset(); show("Asignación guardada correctamente.", "success", false); };

  const create = useMutation({
    mutationFn: (d: AsignacionForm) => api.post("/asignaciones-orden-cuadrilla", d),
    onSuccess: invalidate,
    onError: (err) => show(getErrorMessage(err), "error"),
  });
  const update = useMutation({
    mutationFn: (d: AsignacionForm) => api.put(`/asignaciones-orden-cuadrilla/${editId}`, d),
    onSuccess: invalidate,
    onError: (err) => show(getErrorMessage(err), "error"),
  });
  const remove2 = useMutation({
    mutationFn: (id: number) => api.delete(`/asignaciones-orden-cuadrilla/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["asignaciones-orden-cuadrilla"] }); show("Asignación eliminada.", "success"); },
    onError: (err) => show(getErrorMessage(err), "error"),
  });

  const edit = (a: AsignacionOrdenCuadrilla) => {
    const orden = ordenes.find(o => o.id === a.ordenTrabajoId);
    setForm({ ordenTrabajoId: a.ordenTrabajoId, cuadrillaId: a.cuadrillaId, cantidadAsignada: orden?.cantidadRequerida ?? a.cantidadAsignada, estado: a.estado });
    setEditId(a.id); setErrors({}); setOpen(true);
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "ordenTrabajoId") {
      const ordenId = Number(value);
      const orden = ordenes.find(o => o.id === ordenId);
      setForm(p => ({ ...p, ordenTrabajoId: ordenId, cantidadAsignada: orden?.cantidadRequerida ?? 0 }));
    } else {
      setForm(p => ({ ...p, [name]: name === "cuadrillaId" ? Number(value) : value }));
    }
    if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateAsignacionOrden(form);
    if (hasErrors(errs)) { setErrors(errs); return; }
    editId ? update.mutate(form) : create.mutate(form);
  };

  const selectCls = (field: string) =>
    `border rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white w-full ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"}`;

  return (
    <div className="max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={remove} />

      {/* Header */}
      <div id="asignacion-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div className="flex items-center gap-3">
          <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GitMerge size={22} color="#2D6A4F" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 m-0">Asignación de Orden a Cuadrilla</h1>
            <p className="text-sm text-gray-500 mt-1">Distribución de órdenes de trabajo entre cuadrillas de producción.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={startTour}
            className="bg-white text-[#2D6A4F] text-sm font-semibold px-5 py-2.5 rounded-lg border border-[#2D6A4F] hover:bg-green-50 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2">
            <HelpCircle size={15} color="#2D6A4F" />
            ¿Necesitas ayuda?
          </button>
          <button id="asignacion-nuevo-btn" onClick={() => { reset(); setOpen(true); }}
            className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0 flex items-center gap-2">
            <Plus size={16} />
            Nueva Asignación
          </button>
        </div>
      </div>

      {/* Stats */}
      <div id="asignacion-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Asignaciones", value: data.length, color: "text-gray-900" },
          { label: "Activas", value: activas, color: "text-[#2D6A4F]" },
          { label: "Inactivas", value: inactivas, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div id="asignacion-filtros" className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative min-w-0">
          <Search size={15} color="#9ca3af" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input placeholder="Buscar por orden o cuadrilla..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none text-gray-900" />
        </div>
        <select value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 bg-white">
          <option value="">Estado: Todos</option>
          <option value="activo">ACTIVO</option>
          <option value="inactivo">INACTIVO</option>
        </select>
      </div>

      {/* Tabla */}
      <div id="asignacion-tabla" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? <p className="text-center py-12 text-gray-400">Cargando...</p>
          : filtered.length === 0 ? <p className="text-center py-12 text-gray-400">Sin resultados</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Orden de trabajo", "Cuadrilla", "Cantidad asignada", "Estado", "Acciones"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((a, i) => (
                    <tr key={a.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-gray-500">Orden - {getOrdenNumero(a.ordenTrabajoId)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{getCuadrillaName(a.cuadrillaId)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{a.cantidadAsignada}</span>
                      </td>
                      <td className="px-4 py-3"><Badge label={a.estado.toUpperCase()} color={a.estado === "activo" ? "green" : "gray"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => edit(a)} title="Editar asignación"
                            className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md px-2 py-1.5 cursor-pointer transition-colors flex items-center">
                            <Pencil size={13} color="#d97706" />
                          </button>
                          <button onClick={() => remove2.mutate(a.id)} title="Eliminar asignación"
                            className="bg-red-50 hover:bg-red-100 border-0 rounded-md px-2 py-1.5 cursor-pointer transition-colors flex items-center">
                            <Trash2 size={13} color="#dc2626" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} asignaciones
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40 cursor-pointer hover:bg-gray-50">← Anterior</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer ${n === page ? "bg-[#2D6A4F] text-white border-[#2D6A4F]" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40 cursor-pointer hover:bg-gray-50">Siguiente →</button>
            </div>
          </div>
        )}
        {totalPages <= 1 && filtered.length > 0 && (
          <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">Mostrando {filtered.length} de {data.length} asignaciones</p>
        )}
      </div>

      {/* Modal */}
      <Modal open={open} title={editId ? "Editar Asignación" : "Nueva Asignación"} subtitle="Asigne una orden de trabajo a una cuadrilla de producción." onClose={reset}>
        <form onSubmit={submit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Orden de trabajo *
                {tourDone && <TipIcon element="#f-aso-orden" title="Orden de Trabajo" description="Selecciona la orden que será asignada a la cuadrilla. La cantidad asignada se tomará automáticamente de la orden." />}
              </label>
              <select id="f-aso-orden" name="ordenTrabajoId" value={form.ordenTrabajoId} onChange={change} className={selectCls("ordenTrabajoId")}>
                <option value={0}>Seleccionar orden</option>
                {ordenes.map(o => <option key={o.id} value={o.id}>Orden - {o.numeroOrden}</option>)}
              </select>
              <FieldError msg={errors.ordenTrabajoId} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Cuadrilla *
                {tourDone && <TipIcon element="#f-aso-cuadrilla" title="Cuadrilla" description="Grupo de trabajo que se encargará de ejecutar esta orden de producción." />}
              </label>
              <select id="f-aso-cuadrilla" name="cuadrillaId" value={form.cuadrillaId} onChange={change} className={selectCls("cuadrillaId")}>
                <option value={0}>Seleccionar cuadrilla</option>
                {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <FieldError msg={errors.cuadrillaId} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Cantidad asignada
                {tourDone && <TipIcon element="#f-aso-cantidad" title="Cantidad Asignada" description="Este valor se toma automáticamente de la cantidad requerida en la orden seleccionada. No puede modificarse manualmente." />}
              </label>
              <input id="f-aso-cantidad" name="cantidadAsignada" type="number" value={form.cantidadAsignada} readOnly
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 outline-none bg-gray-100 cursor-not-allowed w-full font-normal" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Estado
                {tourDone && <TipIcon element="#f-aso-estado" title="Estado" description="Activo: la asignación está vigente. Inactivo: la asignación fue suspendida pero se conserva el historial." />}
              </label>
              <div id="f-aso-estado" className="flex gap-4 mt-1">
                {["activo", "inactivo"].map(est => (
                  <label key={est} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="radio" name="estado" value={est} checked={form.estado === est} onChange={change} />
                    {est === "activo" ? "Activo" : "Inactivo"}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
            <button type="button" onClick={reset} className="bg-white text-gray-900 border border-gray-200 rounded-lg px-5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending || update.isPending}
              className="bg-[#2D6A4F] text-white rounded-lg px-5 py-2.5 text-sm font-semibold border-0 cursor-pointer hover:bg-[#245a42] transition-colors disabled:opacity-50 flex items-center gap-2">
              {editId ? <><Pencil size={14} /> Actualizar Asignación</> : <><Plus size={14} /> Guardar Asignación</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
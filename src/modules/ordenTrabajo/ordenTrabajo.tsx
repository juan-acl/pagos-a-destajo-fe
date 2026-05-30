import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Plus, HelpCircle, Pencil, Trash2, Search, Calendar } from "lucide-react";
import api from "@/api";
import { getErrorMessage } from "@/utils/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import ToastContainer from "@/components/ui/Toastcontainer";
import { useToast } from "@/hooks/useToast";
import { useTour } from "@/hooks/useTour";
import { useTooltip } from "@/hooks/useTooltip";
import { useAuthStore } from "@/store/authStore";
import { validateOrdenTrabajo, hasErrors, type Errors } from "@/utils/validators";
import { ORDEN_TRABAJO_TOUR_STEPS } from "./tour";

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

const fetcherOrdenes = () => api.get<{ data: OrdenTrabajo[] }>("/ordenes-trabajo").then(r => r.data.data);
const fetcherMedidas = () => api.get<{ data: Medida[] }>("/medidas").then(r => r.data.data);

export default function OrdenTrabajo() {
  const qc = useQueryClient();
  const { empleado: authEmpleado } = useAuthStore();
  const [form, setForm] = useState<OrdenTrabajoForm>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [page, setPage] = useState(1);

  const { toasts, show, remove } = useToast();
  const { startTour } = useTour(ORDEN_TRABAJO_TOUR_STEPS, "ordenes-trabajo", authEmpleado?.id);

  const tourKey = authEmpleado?.id != null ? `pad_tour_ordenes_v1_${authEmpleado.id}` : null;
  const [tourDone, setTourDone] = useState(() => tourKey ? localStorage.getItem(tourKey) === "1" : false);
  useEffect(() => {
    if (!tourKey || tourDone) return;
    const interval = setInterval(() => {
      if (localStorage.getItem(tourKey) === "1") setTourDone(true);
    }, 500);
    return () => clearInterval(interval);
  }, [tourKey, tourDone]);

  const { data = [], isLoading } = useQuery({ queryKey: ["ordenes-trabajo"], queryFn: fetcherOrdenes });
  const { data: medidas = [] } = useQuery({ queryKey: ["medidas"], queryFn: fetcherMedidas });

  const filtered = useMemo(() => data.filter(o => {
    const texto = `${o.numeroOrden} ${o.estado}`.toLowerCase();
    return (!search || texto.includes(search.toLowerCase())) && (!filterEstado || o.estado === filterEstado);
  }), [data, search, filterEstado]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filtered, page],
  );

  const activas = data.filter(o => o.estado === "activo").length;
  const inactivas = data.filter(o => o.estado === "inactivo").length;

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); setErrors({}); };
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["ordenes-trabajo"] }); reset(); show("Orden guardada correctamente.", "success", false); };

  const create = useMutation({
    mutationFn: (d: OrdenTrabajoForm) => api.post("/ordenes-trabajo", d),
    onSuccess: invalidate,
    onError: (err) => show(getErrorMessage(err), "error"),
  });
  const update = useMutation({
    mutationFn: (d: OrdenTrabajoForm) => api.put(`/ordenes-trabajo/${editId}`, d),
    onSuccess: invalidate,
    onError: (err) => show(getErrorMessage(err), "error"),
  });
  const remove2 = useMutation({
    mutationFn: (id: number) => api.delete(`/ordenes-trabajo/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ordenes-trabajo"] }); show("Orden eliminada.", "success"); },
    onError: (err) => show(getErrorMessage(err), "error"),
  });

  const edit = (o: OrdenTrabajo) => {
    setForm({ cantidadRequerida: o.cantidadRequerida, medidaId: o.medidaId ?? null, pagoUnitario: o.pagoUnitario, fechaLimite: o.fechaLimite ?? "", estado: o.estado, modalidad: o.modalidad ?? "DESTAJO" });
    setEditId(o.id); setErrors({}); setOpen(true);
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: name === "cantidadRequerida" || name === "pagoUnitario" || name === "medidaId" ? value === "" ? null : Number(value) : value }));
    if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateOrdenTrabajo(form);
    if (hasErrors(errs)) { setErrors(errs); return; }
    editId ? update.mutate(form) : create.mutate(form);
  };

  const getMedidaNombre = (id?: number | null) => medidas.find(m => m.id === id)?.nombre ?? "-";

  const inputCls = (field: string) =>
    `border rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal w-full ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"}`;
  const selectCls = (field: string) =>
    `border rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white w-full ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"}`;

  return (
    <div className="max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={remove} />

      {/* Header */}
      <div id="ordenes-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div className="flex items-center gap-3">
          <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ClipboardCheck size={22} color="#2D6A4F" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 m-0">Órdenes de Trabajo</h1>
            <p className="text-sm text-gray-500 mt-1">Creación y seguimiento de órdenes de producción.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={startTour}
            className="bg-white text-[#2D6A4F] text-sm font-semibold px-5 py-2.5 rounded-lg border border-[#2D6A4F] hover:bg-green-50 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2">
            <HelpCircle size={15} color="#2D6A4F" />
            ¿Necesitas ayuda?
          </button>
          <button id="ordenes-nuevo-btn" onClick={() => { reset(); setOpen(true); }}
            className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0 flex items-center gap-2">
            <Plus size={16} />
            Nueva Orden
          </button>
        </div>
      </div>

      {/* Stats */}
      <div id="ordenes-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Órdenes", value: data.length, color: "text-gray-900" },
          { label: "Activas", value: activas, color: "text-[#2D6A4F]" },
          { label: "Inactivas", value: inactivas, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div id="ordenes-filtros" className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative min-w-0">
          <Search size={15} color="#9ca3af" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input placeholder="Buscar por número de orden..." value={search}
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
      <div id="ordenes-tabla" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? <p className="text-center py-12 text-gray-400">Cargando...</p>
          : filtered.length === 0 ? <p className="text-center py-12 text-gray-400">Sin resultados</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["N° Orden", "Cantidad", "Medida", "Modalidad", "Pago unitario", "Fecha límite", "Estado", "Acciones"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((o, i) => (
                    <tr key={o.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-500">{o.numeroOrden}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{o.cantidadRequerida}</td>
                      <td className="px-4 py-3"><Badge label={getMedidaNombre(o.medidaId)} color="blue" /></td>
                      <td className="px-4 py-3"><Badge label={o.modalidad === "PAGO_POR_DIAS" ? "Por día" : "Destajo"} color={o.modalidad === "PAGO_POR_DIAS" ? "amber" : "green"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-900">Q {Number(o.pagoUnitario).toFixed(2)}</span>
                          <span className="ml-1 text-xs font-normal text-gray-400">{o.modalidad === "PAGO_POR_DIAS" ? "/día" : "/pieza"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-500">
                          {o.fechaLimite && <Calendar size={13} color="#9ca3af" />}
                          {o.fechaLimite ? new Date(o.fechaLimite).toLocaleDateString() : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge label={o.estado.toUpperCase()} color={o.estado === "activo" ? "green" : "gray"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => edit(o)} title="Editar orden"
                            className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md px-2 py-1.5 cursor-pointer transition-colors flex items-center">
                            <Pencil size={13} color="#d97706" />
                          </button>
                          <button onClick={() => remove2.mutate(o.id)} title="Eliminar orden"
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
              Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} órdenes
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
          <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">Mostrando {filtered.length} de {data.length} órdenes</p>
        )}
      </div>

      {/* Modal */}
      <Modal open={open} title={editId ? "Editar Orden de Trabajo" : "Nueva Orden de Trabajo"} subtitle="El número de orden se genera automáticamente al guardar." onClose={reset}>
        <form onSubmit={submit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editId && (
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide sm:col-span-2">
                Número de orden
                <input value={data.find(o => o.id === editId)?.numeroOrden ?? ""} readOnly
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 outline-none bg-gray-50 cursor-not-allowed font-normal normal-case tracking-normal" />
              </label>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Cantidad requerida *
                {tourDone && <TipIcon element="#f-ord-cantidad" title="Cantidad Requerida" description="Número total de piezas o unidades que se deben producir en esta orden. Debe ser un número entero mayor a cero." />}
              </label>
              <input id="f-ord-cantidad" name="cantidadRequerida" type="number" value={form.cantidadRequerida} onChange={change} min={1} placeholder="Ej. 500" className={inputCls("cantidadRequerida")} />
              <FieldError msg={errors.cantidadRequerida} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Medida
                {tourDone && <TipIcon element="#f-ord-medida" title="Unidad de Medida" description="Unidad en la que se mide la producción. Ej: Kilogramos, Metros. Opcional." />}
              </label>
              <select id="f-ord-medida" name="medidaId" value={form.medidaId ?? ""} onChange={change} className={selectCls("medidaId")}>
                <option value="">Sin medida</option>
                {medidas.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.iniciales})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Modalidad de pago *
                {tourDone && <TipIcon element="#f-ord-modalidad" title="Modalidad de Pago" description="Destajo: se paga por pieza producida. Pago por día: se paga por día trabajado." />}
              </label>
              <select id="f-ord-modalidad" name="modalidad" value={form.modalidad} onChange={change} className={selectCls("modalidad")}>
                <option value="DESTAJO">Destajo (por pieza)</option>
                <option value="PAGO_POR_DIAS">Pago por día</option>
              </select>
              <FieldError msg={errors.modalidad} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                {form.modalidad === "PAGO_POR_DIAS" ? "Pago por día *" : "Pago unitario *"}
                {tourDone && <TipIcon element="#f-ord-pago" title="Pago Unitario" description="Monto en quetzales que se paga por cada pieza aprobada (Destajo) o por cada día trabajado (Pago por día)." />}
              </label>
              <input id="f-ord-pago" name="pagoUnitario" type="number" value={form.pagoUnitario} onChange={change} min={0} step="0.01"
                placeholder={form.modalidad === "PAGO_POR_DIAS" ? "Ej. 150.00" : "Ej. 2.50"} className={inputCls("pagoUnitario")} />
              <FieldError msg={errors.pagoUnitario} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Fecha límite
                {tourDone && <TipIcon element="#f-ord-fecha" title="Fecha Límite" description="Fecha máxima para completar la orden. Opcional, pero recomendada para control de producción." />}
              </label>
              <input id="f-ord-fecha" name="fechaLimite" type="date" value={form.fechaLimite ?? ""} onChange={change} className={inputCls("fechaLimite")} />
              <FieldError msg={errors.fechaLimite} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Estado
                {tourDone && <TipIcon element="#f-ord-estado" title="Estado" description="Activo: la orden está en curso. Inactivo: la orden fue suspendida pero se conserva el historial." />}
              </label>
              <div id="f-ord-estado" className="flex gap-4 mt-1">
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
              {editId ? <><Pencil size={14} /> Actualizar Orden</> : <><Plus size={14} /> Guardar Orden</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
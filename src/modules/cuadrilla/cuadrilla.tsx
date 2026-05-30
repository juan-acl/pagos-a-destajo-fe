import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import { getErrorMessage } from "@/utils/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import ToastContainer from "@/components/ui/Toastcontainer";
import { useToast } from "@/hooks/useToast";
import { useTour } from "@/hooks/useTour";
import { useTooltip } from "@/hooks/useTooltip";
import { useAuthStore } from "@/store/authStore";
import { validateCuadrilla, hasErrors, type Errors } from "@/utils/validators";
// Importamos LayoutGrid para usarlo como el ícono del encabezado del módulo
import { Pencil, Trash2, LayoutGrid } from "lucide-react";

const ITEMS_PER_PAGE = 10;

type Area = { id: number; nombre: string; };
type Cuadrilla = {
  id: number;
  nombre: string;
  codigoCuadrilla?: string | null;
  areaId?: number | null;
  estado: string;
};
type CuadrillaForm = Omit<Cuadrilla, "id" | "codigoCuadrilla">;

const empty: CuadrillaForm = { nombre: "", areaId: null, estado: "ACTIVO" };

const TOUR_STEPS = [
  { element: "#cua-header", popover: { title: "👥 Módulo de Cuadrillas", description: "Aquí gestionas los grupos de trabajo. Cada cuadrilla agrupa empleados que operan en un área productiva específica." } },
  { element: "#cua-nuevo-btn", popover: { title: "➕ Nueva Cuadrilla", description: "Crea una nueva cuadrilla asignándole un nombre y el área productiva a la que pertenece." } },
  { element: "#cua-stats", popover: { title: "📊 Resumen operativo", description: "Ve de un vistazo cuántas cuadrillas existen, cuántas están activas y cuántas inactivas." } },
  { element: "#cua-filtros", popover: { title: "🔍 Filtros", description: "Busca cuadrillas por nombre o código, filtra por área y por estado operativo." } },
  { element: "#cua-tabla", popover: { title: "📄 Listado de cuadrillas", description: "Cada fila muestra una cuadrilla con su código, área asignada y estado." } },
];

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

const fetchCuadrillas = () => api.get<{ data: Cuadrilla[] }>("/cuadrillas").then(r => r.data.data);
const fetchAreas = () => api.get<{ data: Area[] }>("/area").then(r => r.data.data);

export default function CuadrillaModule() {
  const qc = useQueryClient();
  const { empleado: authEmpleado } = useAuthStore();
  const [form, setForm] = useState<CuadrillaForm>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [page, setPage] = useState(1);

  const { toasts, show, remove } = useToast();

  const { startTour } = useTour(TOUR_STEPS, "cuadrillas", authEmpleado?.id);
  const tourKey = authEmpleado?.id != null ? `pad_tour_cuadrillas_v1_${authEmpleado.id}` : null;
  const [tourDone, setTourDone] = useState(() => tourKey ? localStorage.getItem(tourKey) === "1" : false);
  
  useEffect(() => {
    if (!tourKey || tourDone) return;
    const interval = setInterval(() => {
      if (localStorage.getItem(tourKey) === "1") setTourDone(true);
    }, 500);
    return () => clearInterval(interval);
  }, [tourKey, tourDone]);

  const { data = [], isLoading } = useQuery({ queryKey: ["cuadrillas"], queryFn: fetchCuadrillas });
  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: fetchAreas });

  const filtered = useMemo(() => data.filter(c => {
    const texto = `${c.nombre} ${c.codigoCuadrilla ?? ""}`.toLowerCase();
    return (!search || texto.includes(search.toLowerCase())) 
      && (!filterArea || String(c.areaId) === filterArea)
      && (!filterEstado || c.estado === filterEstado);
  }), [data, search, filterArea, filterEstado]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filtered, page],
  );

  const activas = data.filter(c => c.estado === "ACTIVO").length;
  const inactivas = data.filter(c => c.estado === "INACTIVO").length;

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); setErrors({}); };

  const invalidate = (msg: string) => { 
    qc.invalidateQueries({ queryKey: ["cuadrillas"] }); 
    reset(); 
    setPage(1);
    show(msg, "success", false); 
  };

  const create = useMutation({
    mutationFn: (d: CuadrillaForm) => api.post("/cuadrillas", d),
    onSuccess: () => invalidate("Cuadrilla creada correctamente."),
    onError: (err) => show(getErrorMessage(err), "error"),
  });

  const update = useMutation({
    mutationFn: (d: CuadrillaForm) => api.put(`/cuadrillas/${editId}`, d),
    onSuccess: () => invalidate("Cuadrilla actualizada correctamente."),
    onError: (err) => show(getErrorMessage(err), "error"),
  });

  const remove2 = useMutation({
    mutationFn: (id: number) => api.delete(`/cuadrillas/${id}`),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["cuadrillas"] }); 
      setPage(1);
      show("Cuadrilla eliminada correctamente.", "success", false); 
    },
    onError: (err) => show(getErrorMessage(err), "error"),
  });

  const edit = (c: Cuadrilla) => {
    setForm({ nombre: c.nombre, areaId: c.areaId ?? null, estado: c.estado });
    setEditId(c.id); setErrors({}); setOpen(true);
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: name === "areaId" ? (value ? Number(value) : null) : value }));
    if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateCuadrilla(form);
    if (hasErrors(errs)) {
      setErrors(errs);
      return;
    }
    editId ? update.mutate(form) : create.mutate(form);
  };

  const getNombreArea = (id: number | null | undefined) => areas.find(a => a.id === id)?.nombre ?? null;

  const inputCls = (field: string) =>
    `border rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal w-full ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"}`;

  return (
    <div className="max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={remove} />

      {/* Header con el ícono integrado */}
      <div id="cua-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div className="flex items-start gap-4">
          {/* Contenedor del ícono del módulo */}
          <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0 text-[#2D6A4F] mt-1">
            <LayoutGrid className="w-6 h-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 m-0">Cuadrillas</h1>
            <p className="text-sm text-gray-500 mt-1">Gestione los grupos de trabajo y supervise su estado operativo.</p>
          </div>
        </div>
        <div className="flex gap-3 self-end sm:self-center">
          <button onClick={startTour}
            className="bg-white text-[#2D6A4F] text-sm font-semibold px-5 py-2.5 rounded-lg border border-[#2D6A4F] hover:bg-green-50 transition-colors whitespace-nowrap cursor-pointer">
            ¿Necesitas ayuda?
          </button>
          <button id="cua-nuevo-btn" onClick={() => { reset(); setOpen(true); }}
            className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0">
            + Nueva Cuadrilla
          </button>
        </div>
      </div>

      {/* Stats */}
      <div id="cua-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Cuadrillas", value: data.length, color: "text-gray-900" },
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
      <div id="cua-filtros" className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input placeholder="Buscar por nombre o código..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 min-w-0" />
        
        <select value={filterArea} onChange={e => { setFilterArea(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 bg-white">
          <option value="">Área: Todas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>

        <select value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 bg-white">
          <option value="">Estado: Todos</option>
          <option value="ACTIVO">ACTIVO</option>
          <option value="INACTIVO">INACTIVO</option>
        </select>
      </div>

      {/* Tabla */}
      <div id="cua-tabla" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? <p className="text-center py-12 text-gray-400">Cargando...</p>
          : filtered.length === 0 ? <p className="text-center py-12 text-gray-400">Sin resultados</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Código", "Cuadrilla", "Área", "Estado", "Acciones"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c, i) => (
                    <tr key={c.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-gray-500 font-semibold">{c.codigoCuadrilla ?? "-"}</span></td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{c.nombre}</td>
                      <td className="px-4 py-3">
                        {getNombreArea(c.areaId) ? (
                          <Badge label={getNombreArea(c.areaId)!} color="green" />
                        ) : (
                          <span className="text-xs text-gray-400">Sin área asignada</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><Badge label={c.estado} color={c.estado === "ACTIVO" ? "green" : "gray"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => edit(c)} title="Editar"
                            type="button"
                            className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md p-1.5 cursor-pointer transition-colors flex items-center justify-center text-amber-600">
                            <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </button>
                          <button onClick={() => remove2.mutate(c.id)} title="Eliminar"
                            type="button"
                            className="bg-red-50 hover:bg-red-100 border-0 rounded-md p-1.5 cursor-pointer transition-colors flex items-center justify-center text-red-600">
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} cuadrillas
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
          <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">Mostrando {filtered.length} de {data.length} cuadrillas</p>
        )}
      </div>

      {/* Modal Formulario */}
      <Modal open={open} title={editId ? "Editar Cuadrilla" : "Registro de Cuadrilla"} subtitle="Asigne un nombre y el área productiva correspondiente para el grupo de trabajo." onClose={reset}>
        <form onSubmit={submit} noValidate>
          <div className="grid grid-cols-1 gap-4">
            
            {editId && (
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Código de Cuadrilla
                <input value={data.find(c => c.id === editId)?.codigoCuadrilla ?? ""} readOnly
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 outline-none bg-gray-50 cursor-not-allowed font-normal normal-case tracking-normal w-full" />
              </label>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Nombre de Cuadrilla *
                {tourDone && <TipIcon element="#f-nombre-cua" title="Nombre de Cuadrilla" description="Nombre identificativo único del grupo de trabajo." />}
              </label>
              <input id="f-nombre-cua" name="nombre" placeholder="Ej. Cuadrilla Alfa" value={form.nombre} onChange={change} className={inputCls("nombre")} />
              <FieldError msg={errors.nombre} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Área Asignada
                {tourDone && <TipIcon element="#f-area-cua" title="Área" description="Zona productiva o física asignada al grupo." />}
              </label>
              <select id="f-area-cua" name="areaId" value={form.areaId ?? ""} onChange={change}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white w-full">
                <option value="">Seleccione área...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Estado Operativo
              </label>
              <div className="flex gap-4 mt-2">
                {["ACTIVO", "INACTIVO"].map(est => (
                  <label key={est} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="radio" name="estado" value={est} checked={form.estado === est} onChange={change} />
                    {est.charAt(0) + est.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </div>

          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
            <button type="button" onClick={reset} className="bg-white text-gray-900 border border-gray-200 rounded-lg px-5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending || update.isPending}
              className="bg-[#2D6A4F] text-white rounded-lg px-5 py-2.5 text-sm font-semibold border-0 cursor-pointer hover:bg-[#245a42] transition-colors disabled:opacity-50">
              {editId ? "Actualizar Cuadrilla" : "Guardar Cuadrilla"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
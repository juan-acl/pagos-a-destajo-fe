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
import { validateEmpleado, hasErrors, type Errors } from "@/utils/validators";

const ITEMS_PER_PAGE = 10;

type Puesto = { id: number; nombre: string; };
type Empleado = {
  id: number;
  primerNombre: string;
  segundoNombre?: string | null;
  primerApellido: string;
  segundoApellido?: string | null;
  email: string;
  codigoEmpleado?: string | null;
  pstPuesto?: number | null;
  estado: string;
};
type EmpleadoForm = Omit<Empleado, "id" | "codigoEmpleado"> & { password: string };

const empty: EmpleadoForm = {
  primerNombre: "", segundoNombre: "", primerApellido: "", segundoApellido: "",
  email: "", password: "", pstPuesto: null, estado: "ACTIVO",
};

const TOUR_STEPS = [
  { element: "#emp-header", popover: { title: "📋 Módulo de Empleados", description: "Desde aquí gestionas toda la fuerza laboral: registros, roles y estado operativo de cada persona." } },
  { element: "#emp-nuevo-btn", popover: { title: "➕ Nuevo Empleado", description: "Haz clic aquí para registrar un nuevo empleado. Tendrás que llenar su información personal, correo y contraseña temporal." } },
  { element: "#emp-stats", popover: { title: "📊 Estadísticas rápidas", description: "Aquí ves de un vistazo cuántos empleados hay en total, cuántos están activos y cuántos inactivos." } },
  { element: "#emp-filtros", popover: { title: "🔍 Filtros de búsqueda", description: "Busca por nombre o código, filtra por puesto o por estado. Los filtros se combinan automáticamente." } },
  { element: "#emp-tabla", popover: { title: "📄 Lista de empleados", description: "Cada fila muestra un empleado. Usa ✏️ para editar o 🗑️ para eliminar." } },
];

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span style={{ color: "#DC3545", fontSize: "11px", marginTop: "2px" }}>{msg}</span>;
}

function TipIcon({ element, title, description }: { element: string; title: string; description: string }) {
  const { showTooltip } = useTooltip();
  return (
    <button type="button" onClick={() => showTooltip(element, title, description)}
      className="text-gray-400 hover:text-[#2D6A4F] transition-colors bg-transparent border-0 cursor-pointer p-0 text-xs leading-none ml-1" title="Más información">
      ⓘ
    </button>
  );
}

const fetchEmpleados = () => api.get<{ data: Empleado[] }>("/empleados").then(r => r.data.data);
const fetchPuestos = () => api.get<{ data: Puesto[] }>("/position-workers").then(r => r.data.data);

export default function EmpleadoModule() {
  const qc = useQueryClient();
  const { empleado: authEmpleado } = useAuthStore();
  const [form, setForm] = useState<EmpleadoForm>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPuesto, setFilterPuesto] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [page, setPage] = useState(1);

  const { toasts, show, remove } = useToast();

  // Tour con firma de develop
 const { startTour } = useTour(TOUR_STEPS, "empleados", authEmpleado?.id);
  const tourKey = authEmpleado?.id != null ? `pad_tour_empleados_v1_${authEmpleado.id}` : null;
  const [tourDone, setTourDone] = useState(() => tourKey ? localStorage.getItem(tourKey) === "1" : false);
  useEffect(() => {
    if (!tourKey || tourDone) return;
    const interval = setInterval(() => {
      if (localStorage.getItem(tourKey) === "1") setTourDone(true);
    }, 500);
    return () => clearInterval(interval);
  }, [tourKey, tourDone]);

  const { data = [], isLoading } = useQuery({ queryKey: ["empleados"], queryFn: fetchEmpleados });
  const { data: puestos = [] } = useQuery({ queryKey: ["puestos"], queryFn: fetchPuestos });

  const filtered = useMemo(() => data.filter(e => {
    const nombre = `${e.primerNombre} ${e.primerApellido} ${e.codigoEmpleado ?? ""}`.toLowerCase();
    return (!search || nombre.includes(search.toLowerCase()))
      && (!filterPuesto || String(e.pstPuesto) === filterPuesto)
      && (!filterEstado || e.estado === filterEstado);
  }), [data, search, filterPuesto, filterEstado]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filtered, page],
  );

  const activos = data.filter(e => e.estado === "ACTIVO").length;
  const inactivos = data.filter(e => e.estado === "INACTIVO").length;

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); setErrors({}); };

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["empleados"] }); reset(); show("Empleado guardado correctamente.", "success"); };

  const create = useMutation({
    mutationFn: (d: EmpleadoForm) => api.post("/empleados", d),
    onSuccess: invalidate,
    onError: (err) => show(getErrorMessage(err), "error"),
  });

  const update = useMutation({
    mutationFn: (d: EmpleadoForm) => api.put(`/empleados/${editId}`, d),
    onSuccess: invalidate,
    onError: (err) => show(getErrorMessage(err), "error"),
  });

  const remove2 = useMutation({
    mutationFn: (id: number) => api.delete(`/empleados/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["empleados"] }); show("Empleado eliminado.", "success"); },
    onError: (err) => show(getErrorMessage(err), "error"),
  });

  const edit = (e: Empleado) => {
    setForm({ ...e, password: "", segundoNombre: e.segundoNombre ?? "", segundoApellido: e.segundoApellido ?? "" });
    setEditId(e.id); setErrors({}); setOpen(true);
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: name === "pstPuesto" ? (value ? Number(value) : null) : value }));
    if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateEmpleado(form, !!editId);
    if (hasErrors(errs)) {
      setErrors(errs);
      show("Revisa los campos marcados en rojo antes de continuar.", "warning");
      return;
    }
    editId ? update.mutate(form) : create.mutate(form);
  };

  const getNombrePuesto = (id: number | null | undefined) => puestos.find(p => p.id === id)?.nombre ?? null;

  const inputCls = (field: string) =>
    `border rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal w-full ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"}`;

  return (
    <div className="max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={remove} />

      {/* Header */}
      <div id="emp-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">Empleados</h1>
          <p className="text-sm text-gray-500 mt-1">Gestione la fuerza laboral, asigne roles y supervise el estado operativo.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={startTour}
            className="bg-white text-[#2D6A4F] text-sm font-semibold px-5 py-2.5 rounded-lg border border-[#2D6A4F] hover:bg-green-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            ¿Necesitas ayuda?
          </button>
          <button id="emp-nuevo-btn" onClick={() => { reset(); setOpen(true); }}
            className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0">
            + Nuevo Empleado
          </button>
</div>
      </div>

      {/* Stats */}
      <div id="emp-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Plantilla", value: data.length, color: "text-gray-900" },
          { label: "Activos Ahora", value: activos, color: "text-[#2D6A4F]" },
          { label: "Inactivos", value: inactivos, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div id="emp-filtros" className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input placeholder="Buscar por nombre o código..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 min-w-0" />
        <select value={filterPuesto} onChange={e => { setFilterPuesto(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 bg-white">
          <option value="">Puesto: Todos</option>
          {puestos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 bg-white">
          <option value="">Estado: Todos</option>
          <option value="ACTIVO">ACTIVO</option>
          <option value="INACTIVO">INACTIVO</option>
        </select>
      </div>

      {/* Tabla */}
      <div id="emp-tabla" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? <p className="text-center py-12 text-gray-400">Cargando...</p>
          : filtered.length === 0 ? <p className="text-center py-12 text-gray-400">Sin resultados</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Código", "Empleado", "Puesto", "Email", "Estado", "Acciones"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((e, i) => (
                    <tr key={e.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-gray-500 font-semibold">{e.codigoEmpleado ?? "-"}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {e.primerNombre[0]}{e.primerApellido[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{e.primerNombre} {e.segundoNombre ?? ""} {e.primerApellido} {e.segundoApellido ?? ""}</p>
                            <p className="text-xs text-gray-400">{e.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getNombrePuesto(e.pstPuesto) ? <Badge label={getNombrePuesto(e.pstPuesto)!} color="green" /> : <span className="text-xs text-gray-400">Sin puesto</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{e.email}</td>
                      <td className="px-4 py-3"><Badge label={e.estado} color={e.estado === "ACTIVO" ? "green" : "gray"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => edit(e)} className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors" title="Editar">✏️</button>
                          <button onClick={() => remove2.mutate(e.id)} className="bg-red-50 hover:bg-red-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors" title="Eliminar">🗑️</button>
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
              Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} empleados
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
          <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">Mostrando {filtered.length} de {data.length} empleados</p>
        )}
      </div>

      {/* Modal */}
      <Modal open={open} title={editId ? "Editar Empleado" : "Registro de Empleado"} subtitle="Complete la información para integrar al nuevo miembro del equipo." onClose={reset}>
        <form onSubmit={submit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {editId && (
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Código de Empleado
                <input value={data.find(e => e.id === editId)?.codigoEmpleado ?? ""} readOnly
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 outline-none bg-gray-50 cursor-not-allowed font-normal normal-case tracking-normal" />
              </label>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Primer Nombre *
                {tourDone && <TipIcon element="#f-pnombre" title="Primer Nombre" description="Nombre legal del empleado. Solo letras y espacios." />}
              </label>
              <input id="f-pnombre" name="primerNombre" placeholder="Ej. Roberto" value={form.primerNombre} onChange={change} className={inputCls("primerNombre")} />
              <FieldError msg={errors.primerNombre} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Segundo Nombre</label>
              <input name="segundoNombre" placeholder="Ej. Antonio" value={form.segundoNombre ?? ""} onChange={change} className={inputCls("segundoNombre")} />
              <FieldError msg={errors.segundoNombre} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Primer Apellido *
                {tourDone && <TipIcon element="#f-papellido" title="Primer Apellido" description="Apellido legal del empleado. Solo letras y espacios." />}
              </label>
              <input id="f-papellido" name="primerApellido" placeholder="Ej. García" value={form.primerApellido} onChange={change} className={inputCls("primerApellido")} />
              <FieldError msg={errors.primerApellido} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Segundo Apellido</label>
              <input name="segundoApellido" placeholder="Ej. Méndez" value={form.segundoApellido ?? ""} onChange={change} className={inputCls("segundoApellido")} />
              <FieldError msg={errors.segundoApellido} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Correo Electrónico *
                {tourDone && <TipIcon element="#f-email" title="Correo Electrónico" description="Correo institucional del empleado. Debe ser único en el sistema." />}
              </label>
              <input id="f-email" name="email" type="email" placeholder="nombre@correo.com" value={form.email} onChange={change} className={inputCls("email")} />
              <FieldError msg={errors.email} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                {editId ? "Nueva Contraseña (opcional)" : "Contraseña Temporal *"}
                {tourDone && <TipIcon element="#f-pass" title="Contraseña" description="Mínimo 6 caracteres. En edición, déjala vacía para no cambiarla." />}
              </label>
              <input id="f-pass" name="password" type="password" placeholder="••••••••" value={form.password} onChange={change} className={inputCls("password")} />
              <FieldError msg={errors.password} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Puesto Asignado
                {tourDone && <TipIcon element="#f-puesto" title="Puesto" description="Cargo del empleado. Define sus permisos de acceso al sistema." />}
              </label>
              <select id="f-puesto" name="pstPuesto" value={form.pstPuesto ?? ""} onChange={change}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white">
                <option value="">Seleccione puesto...</option>
                {puestos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Estado Inicial
                {tourDone && <TipIcon element="#f-estado-emp" title="Estado" description="ACTIVO: puede operar. INACTIVO: acceso suspendido pero historial conservado." />}
              </label>
              <div id="f-estado-emp" className="flex gap-4 mt-1">
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
              {editId ? "Actualizar Empleado" : "Guardar Empleado"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
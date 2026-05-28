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
import { validateMiembro, hasErrors, type Errors } from "@/utils/validators";

type Empleado = { id: number; codigoEmpleado: string | null; primerNombre: string; primerApellido: string; estado: string; };
type Cuadrilla = { id: number; nombre: string; codigoCuadrilla: string | null; };
type MiembroCuadrilla = {
  id: number; empleadoId: number; cuadrillaId: number;
  empleado?: { codigoEmpleado: string | null; primerNombre: string; primerApellido: string; };
  cuadrilla?: { nombre: string; };
  fechaIngreso?: string | null; estado: string;
};
type MiembroForm = { empleadoId: number; cuadrillaId: number; fechaIngreso: string; estado: string; };

const empty: MiembroForm = { empleadoId: 0, cuadrillaId: 0, fechaIngreso: "", estado: "ACTIVO" };

const TOUR_STEPS = [
  { element: "#mic-header", popover: { title: "🔗 Miembros de Cuadrilla", description: "Aquí asignas empleados a cuadrillas. Un empleado puede pertenecer a varias cuadrillas." } },
  { element: "#mic-masivo-btn", popover: { title: "⚡ Asignación Masiva", description: "Asigna varios empleados a una cuadrilla de una sola vez." } },
  { element: "#mic-nuevo-btn", popover: { title: "➕ Nuevo Miembro", description: "Asigna un empleado individual a una cuadrilla específica." } },
  { element: "#mic-stats", popover: { title: "📊 Estadísticas", description: "Resumen de miembros activos, inactivos y número de cuadrillas." } },
  { element: "#mic-filtros", popover: { title: "🔍 Filtros", description: "Busca por nombre del empleado, filtra por cuadrilla o estado." } },
  { element: "#mic-tabla", popover: { title: "📄 Listado de miembros", description: "Cada fila muestra la relación empleado-cuadrilla con fecha de ingreso." } },
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

const fetchMiembros = () => api.get<{ data: MiembroCuadrilla[] }>("/miembros-cuadrilla").then(r => r.data.data);
const fetchEmpleados = () => api.get<{ data: Empleado[] }>("/empleados").then(r => r.data.data);
const fetchCuadrillas = () => api.get<{ data: Cuadrilla[] }>("/cuadrillas").then(r => r.data.data);

export default function MiembroCuadrillaModule() {
  const qc = useQueryClient();
  const { empleado: authEmpleado } = useAuthStore();
  const [form, setForm] = useState<MiembroForm>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCuadrilla, setFilterCuadrilla] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  const [openMasivo, setOpenMasivo] = useState(false);
  const [cuadrillaSeleccionada, setCuadrillaSeleccionada] = useState<number>(0);
  const [errorMasivoC, setErrorMasivoC] = useState("");
  const [fechaMasiva, setFechaMasiva] = useState("");
  const [errorMasivoF, setErrorMasivoF] = useState("");
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<number[]>([]);
  const [searchMasivo, setSearchMasivo] = useState("");
  const [loadingMasivo, setLoadingMasivo] = useState(false);

  const { toasts, show, remove } = useToast();

  // Tour con firma de develop
  const { startTour } = useTour(TOUR_STEPS, "empleados", authEmpleado?.id);
  const tourKey = authEmpleado?.id != null ? `pad_tour_miembros-cuadrilla_v1_${authEmpleado.id}` : null;
  const [tourDone, setTourDone] = useState(() => tourKey ? localStorage.getItem(tourKey) === "1" : false);
  useEffect(() => {
    if (!tourKey || tourDone) return;
    const interval = setInterval(() => {
      if (localStorage.getItem(tourKey) === "1") setTourDone(true);
    }, 500);
    return () => clearInterval(interval);
  }, [tourKey, tourDone]);

  const { data = [], isLoading } = useQuery({ queryKey: ["miembros-cuadrilla"], queryFn: fetchMiembros });
  const { data: empleados = [] } = useQuery({ queryKey: ["empleados"], queryFn: fetchEmpleados });
  const { data: cuadrillas = [] } = useQuery({ queryKey: ["cuadrillas"], queryFn: fetchCuadrillas });

  const filtered = useMemo(() => data.filter(m => {
    const nombre = `${m.empleado?.primerNombre ?? ""} ${m.empleado?.primerApellido ?? ""} ${m.empleado?.codigoEmpleado ?? ""}`.toLowerCase();
    return (!search || nombre.includes(search.toLowerCase()))
      && (!filterCuadrilla || String(m.cuadrillaId) === filterCuadrilla)
      && (!filterEstado || m.estado === filterEstado);
  }), [data, search, filterCuadrilla, filterEstado]);

  const empleadosYaAsignados = useMemo(() =>
    data.filter(m => m.cuadrillaId === cuadrillaSeleccionada && m.estado === "ACTIVO").map(m => m.empleadoId),
    [data, cuadrillaSeleccionada]);

  const empleadosDisponibles = useMemo(() =>
    empleados.filter(e =>
      e.estado === "ACTIVO" &&
      !empleadosYaAsignados.includes(e.id) &&
      `${e.primerNombre} ${e.primerApellido} ${e.codigoEmpleado ?? ""}`.toLowerCase().includes(searchMasivo.toLowerCase())
    ), [empleados, empleadosYaAsignados, searchMasivo]);

  const activos = data.filter(m => m.estado === "ACTIVO").length;
  const inactivos = data.filter(m => m.estado === "INACTIVO").length;

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); setErrors({}); };
  const resetMasivo = () => { setOpenMasivo(false); setCuadrillaSeleccionada(0); setFechaMasiva(""); setEmpleadosSeleccionados([]); setSearchMasivo(""); setErrorMasivoC(""); setErrorMasivoF(""); };

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["miembros-cuadrilla"] }); reset(); show("Miembro guardado correctamente.", "success"); };

  const create = useMutation({
    mutationFn: (d: MiembroForm) => api.post("/miembros-cuadrilla", d),
    onSuccess: invalidate,
    onError: (err) => show(getErrorMessage(err), "error"),
  });

  const update = useMutation({
    mutationFn: (d: MiembroForm) => api.put(`/miembros-cuadrilla/${editId}`, d),
    onSuccess: invalidate,
    onError: (err) => show(getErrorMessage(err), "error"),
  });

  const remove2 = useMutation({
    mutationFn: (id: number) => api.delete(`/miembros-cuadrilla/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["miembros-cuadrilla"] }); show("Miembro eliminado.", "success"); },
    onError: (err) => show(getErrorMessage(err), "error"),
  });

  const edit = (m: MiembroCuadrilla) => {
    setForm({ empleadoId: m.empleadoId, cuadrillaId: m.cuadrillaId, fechaIngreso: m.fechaIngreso ?? "", estado: m.estado });
    setEditId(m.id); setErrors({}); setOpen(true);
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: name === "empleadoId" || name === "cuadrillaId" ? Number(value) : value }));
    if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateMiembro(form);
    if (hasErrors(errs)) {
      setErrors(errs);
      return;
    }
    editId ? update.mutate(form) : create.mutate(form);
  };

  const toggleEmpleado = (id: number) => setEmpleadosSeleccionados(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  const toggleTodos = () => setEmpleadosSeleccionados(empleadosSeleccionados.length === empleadosDisponibles.length ? [] : empleadosDisponibles.map(e => e.id));

  const submitMasivo = async () => {
    let valid = true;
    if (!cuadrillaSeleccionada) { setErrorMasivoC("Debes seleccionar una cuadrilla."); valid = false; } else setErrorMasivoC("");
    if (fechaMasiva) {
      const f = new Date(fechaMasiva + "T12:00:00");
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      if (f > hoy) { setErrorMasivoF("La fecha no puede ser futura."); valid = false; }
      else if (f < new Date("2000-01-01")) { setErrorMasivoF("La fecha no puede ser anterior al año 2000."); valid = false; }
      else setErrorMasivoF("");
    } else setErrorMasivoF("");
    if (!valid) return;
    if (empleadosSeleccionados.length === 0) { show("Debes seleccionar al menos un empleado.", "warning"); return; }
    setLoadingMasivo(true);
    try {
      await Promise.all(empleadosSeleccionados.map(empleadoId =>
        api.post("/miembros-cuadrilla", { empleadoId, cuadrillaId: cuadrillaSeleccionada, fechaIngreso: fechaMasiva || null, estado: "ACTIVO" })
      ));
      qc.invalidateQueries({ queryKey: ["miembros-cuadrilla"] });
      resetMasivo();
      show(`${empleadosSeleccionados.length} empleado(s) asignados correctamente.`, "success");
    } catch (err) {
      show(getErrorMessage(err), "error");
    } finally {
      setLoadingMasivo(false);
    }
  };

  const formatFecha = (fecha: string | null | undefined) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
  };

  const selectCls = (field: string) =>
    `border rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white w-full ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"}`;

  const inputCls = (field: string) =>
    `border rounded-lg px-3 py-2 text-sm text-gray-900 outline-none w-full ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"}`;

  return (
    <div className="max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={remove} />

      {/* Header */}
      <div id="mic-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">Miembros de Cuadrilla</h1>
          <p className="text-sm text-gray-500 mt-1">Gestione la asignación de empleados a cuadrillas de trabajo.</p>
        </div>
        <div className="flex gap-3">
            <button
            onClick={startTour}
            className="bg-white text-[#2D6A4F] text-sm font-semibold px-5 py-2.5 rounded-lg border border-[#2D6A4F] hover:bg-green-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            ¿Necesitas ayuda?
          </button>
          <button id="mic-masivo-btn" onClick={() => setOpenMasivo(true)}
            className="bg-white text-[#2D6A4F] text-sm font-semibold px-5 py-2.5 rounded-lg border border-[#2D6A4F] hover:bg-green-50 transition-colors whitespace-nowrap cursor-pointer">
            Asignación masiva
          </button>
          <button id="mic-nuevo-btn" onClick={() => { reset(); setOpen(true); }}
            className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0">
            + Nuevo Miembro
          </button>
        </div>
      </div>

      {/* Stats */}
      <div id="mic-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Miembros", value: data.length, color: "text-gray-900" },
          { label: "Activos", value: activos, color: "text-[#2D6A4F]" },
          { label: "Inactivos", value: inactivos, color: "text-red-600" },
          { label: "Cuadrillas", value: cuadrillas.length, color: "text-gray-900" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div id="mic-filtros" className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input placeholder="Buscar por empleado o código..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 min-w-0" />
        <select value={filterCuadrilla} onChange={e => setFilterCuadrilla(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 bg-white">
          <option value="">Cuadrilla: Todas</option>
          {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 bg-white">
          <option value="">Estado: Todos</option>
          <option value="ACTIVO">ACTIVO</option>
          <option value="INACTIVO">INACTIVO</option>
        </select>
      </div>

      {/* Tabla */}
      <div id="mic-tabla" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? <p className="text-center py-12 text-gray-400">Cargando...</p>
          : filtered.length === 0 ? <p className="text-center py-12 text-gray-400">Sin resultados</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Empleado", "Cuadrilla", "Fecha Ingreso", "Estado", "Acciones"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => (
                    <tr key={m.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {m.empleado ? `${m.empleado.primerNombre[0]}${m.empleado.primerApellido[0]}` : "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {m.empleado ? `${m.empleado.primerNombre} ${m.empleado.primerApellido}` : `ID: ${m.empleadoId}`}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{m.empleado?.codigoEmpleado ?? "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{m.cuadrilla ? <Badge label={m.cuadrilla.nombre} color="amber" /> : <span className="text-xs text-gray-400">ID: {m.cuadrillaId}</span>}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatFecha(m.fechaIngreso)}</td>
                      <td className="px-4 py-3"><Badge label={m.estado} color={m.estado === "ACTIVO" ? "green" : "gray"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => edit(m)} className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors">✏️</button>
                          <button onClick={() => remove2.mutate(m.id)} className="bg-red-50 hover:bg-red-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        {filtered.length > 0 && <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">Mostrando {filtered.length} de {data.length} miembros</p>}
      </div>

      {/* Modal individual */}
      <Modal open={open} title={editId ? "Editar Miembro" : "Nuevo Miembro de Cuadrilla"} subtitle="Asigne un empleado a una cuadrilla de trabajo." onClose={reset}>
        <form onSubmit={submit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Empleado *
                {tourDone && <TipIcon element="#f-mic-empleado" title="Empleado" description="Solo se muestran empleados ACTIVOS." />}
              </label>
              <select id="f-mic-empleado" name="empleadoId" value={form.empleadoId || ""} onChange={change} className={selectCls("empleadoId")}>
                <option value="">Seleccione empleado...</option>
                {empleados.filter(e => e.estado !== "INACTIVO").map(e => (
                  <option key={e.id} value={e.id}>{e.codigoEmpleado} - {e.primerNombre} {e.primerApellido}</option>
                ))}
              </select>
              <FieldError msg={errors.empleadoId} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Cuadrilla *
                {tourDone && <TipIcon element="#f-mic-cuadrilla" title="Cuadrilla" description="Grupo de trabajo al que se incorpora el empleado." />}
              </label>
              <select id="f-mic-cuadrilla" name="cuadrillaId" value={form.cuadrillaId || ""} onChange={change} className={selectCls("cuadrillaId")}>
                <option value="">Seleccione cuadrilla...</option>
                {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <FieldError msg={errors.cuadrillaId} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Fecha de Ingreso
                {tourDone && <TipIcon element="#f-mic-fecha" title="Fecha de Ingreso" description="No puede ser futura ni anterior al año 2000." />}
              </label>
              <input id="f-mic-fecha" name="fechaIngreso" type="date" value={form.fechaIngreso}
                min="2000-01-01" max={new Date().toISOString().split("T")[0]}
                onChange={change} className={inputCls("fechaIngreso")} />
              <FieldError msg={errors.fechaIngreso} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Estado
                {tourDone && <TipIcon element="#f-mic-estado" title="Estado" description="ACTIVO: opera en esta cuadrilla. INACTIVO: membresía suspendida." />}
              </label>
              <div id="f-mic-estado" className="flex gap-4 mt-1">
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
              {editId ? "Actualizar" : "Guardar Miembro"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal masivo */}
      <Modal open={openMasivo} title="Asignación masiva" subtitle="Selecciona una cuadrilla y elige los empleados a asignar." onClose={resetMasivo} width={640}>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Cuadrilla *
                {tourDone && <TipIcon element="#f-mas-cuadrilla" title="Cuadrilla destino" description="Todos los empleados seleccionados serán asignados a esta cuadrilla." />}
              </label>
              <select id="f-mas-cuadrilla" value={cuadrillaSeleccionada || ""}
                onChange={e => { setCuadrillaSeleccionada(Number(e.target.value)); setEmpleadosSeleccionados([]); setErrorMasivoC(""); }}
                className={`border rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white w-full ${errorMasivoC ? "border-red-400 bg-red-50" : "border-gray-200"}`}>
                <option value="">Seleccione cuadrilla...</option>
                {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <FieldError msg={errorMasivoC} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Fecha de ingreso
                {tourDone && <TipIcon element="#f-mas-fecha" title="Fecha masiva" description="Se aplicará la misma fecha a todos los empleados seleccionados." />}
              </label>
              <input id="f-mas-fecha" type="date" value={fechaMasiva}
                min="2000-01-01" max={new Date().toISOString().split("T")[0]}
                onChange={e => { setFechaMasiva(e.target.value); setErrorMasivoF(""); }}
                className={`border rounded-lg px-3 py-2 text-sm text-gray-900 outline-none w-full ${errorMasivoF ? "border-red-400 bg-red-50" : "border-gray-200"}`} />
              <FieldError msg={errorMasivoF} />
            </div>
          </div>

          {cuadrillaSeleccionada > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Empleados disponibles
                  {empleadosSeleccionados.length > 0 && (
                    <span className="ml-2 bg-[#2D6A4F] text-white text-xs px-2 py-0.5 rounded-full font-normal normal-case">
                      {empleadosSeleccionados.length} seleccionados
                    </span>
                  )}
                </p>
                <button type="button" onClick={toggleTodos} className="text-xs text-[#2D6A4F] font-semibold bg-transparent border-0 cursor-pointer hover:underline">
                  {empleadosSeleccionados.length === empleadosDisponibles.length && empleadosDisponibles.length > 0 ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              </div>
              <input placeholder="Buscar empleado..." value={searchMasivo} onChange={e => setSearchMasivo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 mb-3" />
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {empleadosDisponibles.length === 0 ? (
                  <p className="text-center py-8 text-sm text-gray-400">
                    {empleadosYaAsignados.length > 0 ? "Todos los empleados activos ya están asignados a esta cuadrilla" : "Sin empleados disponibles"}
                  </p>
                ) : empleadosDisponibles.map((e, i) => (
                  <div key={e.id} onClick={() => toggleEmpleado(e.id)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${empleadosSeleccionados.includes(e.id) ? "bg-green-50" : "hover:bg-gray-100"}`}>
                    <input type="checkbox" checked={empleadosSeleccionados.includes(e.id)} onChange={() => toggleEmpleado(e.id)}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer" onClick={ev => ev.stopPropagation()} />
                    <div className="w-8 h-8 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {e.primerNombre[0]}{e.primerApellido[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{e.primerNombre} {e.primerApellido}</p>
                      <p className="text-xs text-gray-400 font-mono">{e.codigoEmpleado ?? "-"}</p>
                    </div>
                    {empleadosSeleccionados.includes(e.id) && <span className="text-[#2D6A4F] text-sm">✓</span>}
                  </div>
                ))}
              </div>
              {empleadosYaAsignados.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">{empleadosYaAsignados.length} empleado(s) ya asignados no aparecen en la lista.</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
            <button type="button" onClick={resetMasivo} className="bg-white text-gray-900 border border-gray-200 rounded-lg px-5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="button" onClick={submitMasivo} disabled={loadingMasivo || !cuadrillaSeleccionada || empleadosSeleccionados.length === 0}
              className="bg-[#2D6A4F] text-white rounded-lg px-5 py-2.5 text-sm font-semibold border-0 cursor-pointer hover:bg-[#245a42] transition-colors disabled:opacity-50">
              {loadingMasivo ? "Asignando..." : `Asignar ${empleadosSeleccionados.length > 0 ? `(${empleadosSeleccionados.length})` : ""}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";

type Empleado = { id: number; codigoEmpleado: string | null; primerNombre: string; primerApellido: string; estado: string; };
type Cuadrilla = { id: number; nombre: string; codigoCuadrilla: string | null; };
type MiembroCuadrilla = {
  id: number;
  empleadoId: number;
  cuadrillaId: number;
  empleado?: { codigoEmpleado: string | null; primerNombre: string; primerApellido: string; };
  cuadrilla?: { nombre: string; };
  fechaIngreso?: string | null;
  estado: string;
};
type MiembroForm = { empleadoId: number; cuadrillaId: number; fechaIngreso: string; estado: string; };

const empty: MiembroForm = { empleadoId: 0, cuadrillaId: 0, fechaIngreso: "", estado: "ACTIVO" };

const fetchMiembros = () => api.get<{ data: MiembroCuadrilla[] }>("/miembros-cuadrilla").then(r => r.data.data);
const fetchEmpleados = () => api.get<{ data: Empleado[] }>("/empleados").then(r => r.data.data);
const fetchCuadrillas = () => api.get<{ data: Cuadrilla[] }>("/cuadrillas").then(r => r.data.data);

export default function MiembroCuadrillaModule() {
  const qc = useQueryClient();
  const [form, setForm] = useState<MiembroForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCuadrilla, setFilterCuadrilla] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  // Estado asignación masiva
  const [openMasivo, setOpenMasivo] = useState(false);
  const [cuadrillaSeleccionada, setCuadrillaSeleccionada] = useState<number>(0);
  const [fechaMasiva, setFechaMasiva] = useState("");
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<number[]>([]);
  const [searchMasivo, setSearchMasivo] = useState("");
  const [loadingMasivo, setLoadingMasivo] = useState(false);

  const { data = [], isLoading } = useQuery({ queryKey: ["miembros-cuadrilla"], queryFn: fetchMiembros });
  const { data: empleados = [] } = useQuery({ queryKey: ["empleados"], queryFn: fetchEmpleados });
  const { data: cuadrillas = [] } = useQuery({ queryKey: ["cuadrillas"], queryFn: fetchCuadrillas });

  const filtered = useMemo(() => data.filter(m => {
    const nombre = `${m.empleado?.primerNombre ?? ""} ${m.empleado?.primerApellido ?? ""} ${m.empleado?.codigoEmpleado ?? ""}`.toLowerCase();
    const matchSearch = !search || nombre.includes(search.toLowerCase());
    const matchCuadrilla = !filterCuadrilla || String(m.cuadrillaId) === filterCuadrilla;
    const matchEstado = !filterEstado || m.estado === filterEstado;
    return matchSearch && matchCuadrilla && matchEstado;
  }), [data, search, filterCuadrilla, filterEstado]);

  // Empleados ya asignados a la cuadrilla seleccionada
  const empleadosYaAsignados = useMemo(() =>
    data.filter(m => m.cuadrillaId === cuadrillaSeleccionada && m.estado === "ACTIVO").map(m => m.empleadoId),
    [data, cuadrillaSeleccionada]
  );

  // Empleados disponibles para asignar (activos y no asignados a esa cuadrilla)
  const empleadosDisponibles = useMemo(() =>
    empleados.filter(e =>
      e.estado === "ACTIVO" &&
      !empleadosYaAsignados.includes(e.id) &&
      `${e.primerNombre} ${e.primerApellido} ${e.codigoEmpleado ?? ""}`.toLowerCase().includes(searchMasivo.toLowerCase())
    ),
    [empleados, empleadosYaAsignados, searchMasivo]
  );

  const activos = data.filter(m => m.estado === "ACTIVO").length;
  const inactivos = data.filter(m => m.estado === "INACTIVO").length;

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["miembros-cuadrilla"] }); reset(); };
  const create = useMutation({ mutationFn: (d: MiembroForm) => api.post("/miembros-cuadrilla", d), onSuccess: invalidate });
  const update = useMutation({ mutationFn: (d: MiembroForm) => api.put(`/miembros-cuadrilla/${editId}`, d), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/miembros-cuadrilla/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["miembros-cuadrilla"] }) });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); };
  const resetMasivo = () => {
    setOpenMasivo(false);
    setCuadrillaSeleccionada(0);
    setFechaMasiva("");
    setEmpleadosSeleccionados([]);
    setSearchMasivo("");
  };

  const edit = (m: MiembroCuadrilla) => {
    setForm({ empleadoId: m.empleadoId, cuadrillaId: m.cuadrillaId, fechaIngreso: m.fechaIngreso ?? "", estado: m.estado });
    setEditId(m.id); setOpen(true);
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: name === "empleadoId" || name === "cuadrillaId" ? Number(value) : value }));
  };

  const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };

  const toggleEmpleado = (id: number) => {
    setEmpleadosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (empleadosSeleccionados.length === empleadosDisponibles.length) {
      setEmpleadosSeleccionados([]);
    } else {
      setEmpleadosSeleccionados(empleadosDisponibles.map(e => e.id));
    }
  };

  const submitMasivo = async () => {
    if (!cuadrillaSeleccionada || empleadosSeleccionados.length === 0) return;
    setLoadingMasivo(true);
    try {
      await Promise.all(
        empleadosSeleccionados.map(empleadoId =>
          api.post("/miembros-cuadrilla", {
            empleadoId,
            cuadrillaId: cuadrillaSeleccionada,
            fechaIngreso: fechaMasiva || null,
            estado: "ACTIVO",
          })
        )
      );
      qc.invalidateQueries({ queryKey: ["miembros-cuadrilla"] });
      resetMasivo();
    } finally {
      setLoadingMasivo(false);
    }
  };

  const formatFecha = (fecha: string | null | undefined) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">Miembros de Cuadrilla</h1>
          <p className="text-sm text-gray-500 mt-1">Gestione la asignación de empleados a cuadrillas de trabajo.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setOpenMasivo(true)}
            className="bg-white text-[#2D6A4F] text-sm font-semibold px-5 py-2.5 rounded-lg border border-[#2D6A4F] hover:bg-green-50 transition-colors whitespace-nowrap cursor-pointer"
          >
          Asignación masiva
          </button>
          <button
            onClick={() => { reset(); setOpen(true); }}
            className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0"
          >
            + Nuevo Miembro
          </button>
        </div>
      </div>
 
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Miembros", value: data.length, color: "text-gray-900" },
          { label: "Activos", value: activos, color: "text-[#2D6A4F]" },
          { label: "Inactivos", value: inactivos, color: "text-red-600" },
          { label: "Cuadrillas", value: cuadrillas.length, color: "text-gray-900" },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          placeholder="Buscar por empleado o código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 min-w-0"
        />
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <p className="text-center py-12 text-gray-400">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-gray-400">Sin resultados</p>
        ) : (
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
                    <td className="px-4 py-3">
                      {m.cuadrilla
                        ? <Badge label={m.cuadrilla.nombre} color="amber" />
                        : <span className="text-xs text-gray-400">ID: {m.cuadrillaId}</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatFecha(m.fechaIngreso)}</td>
                    <td className="px-4 py-3">
                      <Badge label={m.estado} color={m.estado === "ACTIVO" ? "green" : "gray"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => edit(m)} className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors" title="Editar">✏️</button>
                        <button onClick={() => remove.mutate(m.id)} className="bg-red-50 hover:bg-red-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors" title="Eliminar">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Mostrando {filtered.length} de {data.length} miembros
          </p>
        )}
      </div>

      {/* Modal individual */}
      <Modal open={open} title={editId ? "Editar Miembro" : "Nuevo Miembro de Cuadrilla"} subtitle="Asigne un empleado a una cuadrilla de trabajo." onClose={reset}>
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Empleado *
              <select name="empleadoId" value={form.empleadoId || ""} onChange={change} required className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white font-normal normal-case tracking-normal">
                <option value="">Seleccione empleado...</option>
                {empleados.filter(e => e.estado !== "INACTIVO").map(e => (
                  <option key={e.id} value={e.id}>{e.codigoEmpleado} - {e.primerNombre} {e.primerApellido}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cuadrilla *
              <select name="cuadrillaId" value={form.cuadrillaId || ""} onChange={change} required className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white font-normal normal-case tracking-normal">
                <option value="">Seleccione cuadrilla...</option>
                {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Fecha de Ingreso
              <input name="fechaIngreso" type="date" value={form.fechaIngreso} onChange={change} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Estado
              <div className="flex gap-4 mt-1">
                {["ACTIVO", "INACTIVO"].map(est => (
                  <label key={est} className="flex items-center gap-2 cursor-pointer text-sm font-normal normal-case tracking-normal text-gray-700">
                    <input type="radio" name="estado" value={est} checked={form.estado === est} onChange={change} />
                    {est.charAt(0) + est.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
            <button type="button" onClick={reset} className="bg-white text-gray-900 border border-gray-200 rounded-lg px-5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending || update.isPending} className="bg-[#2D6A4F] text-white rounded-lg px-5 py-2.5 text-sm font-semibold border-0 cursor-pointer hover:bg-[#245a42] transition-colors disabled:opacity-50">
              {editId ? "Actualizar" : "Guardar Miembro"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal asignación masiva */}
      <Modal open={openMasivo} title="Asignación masiva" subtitle="Selecciona una cuadrilla y elige los empleados a asignar." onClose={resetMasivo} width={640}>
        <div className="flex flex-col gap-5">
          {/* Paso 1 — Cuadrilla y fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cuadrilla *
              <select
                value={cuadrillaSeleccionada || ""}
                onChange={e => { setCuadrillaSeleccionada(Number(e.target.value)); setEmpleadosSeleccionados([]); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white font-normal normal-case tracking-normal"
              >
                <option value="">Seleccione cuadrilla...</option>
                {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Fecha de ingreso
              <input
                type="date"
                value={fechaMasiva}
                onChange={e => setFechaMasiva(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal"
              />
            </label>
          </div>

          {/* Paso 2 — Lista de empleados */}
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
                <button
                  type="button"
                  onClick={toggleTodos}
                  className="text-xs text-[#2D6A4F] font-semibold bg-transparent border-0 cursor-pointer hover:underline"
                >
                  {empleadosSeleccionados.length === empleadosDisponibles.length && empleadosDisponibles.length > 0 ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              </div>

              {/* Buscador */}
              <input
                placeholder="Buscar empleado..."
                value={searchMasivo}
                onChange={e => setSearchMasivo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 mb-3"
              />

              {/* Lista */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {empleadosDisponibles.length === 0 ? (
                  <p className="text-center py-8 text-sm text-gray-400">
                    {empleadosYaAsignados.length > 0 ? "Todos los empleados activos ya están asignados a esta cuadrilla" : "Sin empleados disponibles"}
                  </p>
                ) : (
                  empleadosDisponibles.map((e, i) => (
                    <div
                      key={e.id}
                      onClick={() => toggleEmpleado(e.id)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } ${empleadosSeleccionados.includes(e.id) ? "bg-green-50" : "hover:bg-gray-100"}`}
                    >
                      <input
                        type="checkbox"
                        checked={empleadosSeleccionados.includes(e.id)}
                        onChange={() => toggleEmpleado(e.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#2D6A4F] focus:ring-[#2D6A4F] cursor-pointer"
                        onClick={ev => ev.stopPropagation()}
                      />
                      <div className="w-8 h-8 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {e.primerNombre[0]}{e.primerApellido[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{e.primerNombre} {e.primerApellido}</p>
                        <p className="text-xs text-gray-400 font-mono">{e.codigoEmpleado ?? "-"}</p>
                      </div>
                      {empleadosSeleccionados.includes(e.id) && (
                        <span className="text-[#2D6A4F] text-sm">✓</span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Ya asignados */}
              {empleadosYaAsignados.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {empleadosYaAsignados.length} empleado(s) ya asignados a esta cuadrilla no aparecen en la lista.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
            <button type="button" onClick={resetMasivo} className="bg-white text-gray-900 border border-gray-200 rounded-lg px-5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors">Cancelar</button>
            <button
              type="button"
              onClick={submitMasivo}
              disabled={loadingMasivo || !cuadrillaSeleccionada || empleadosSeleccionados.length === 0}
              className="bg-[#2D6A4F] text-white rounded-lg px-5 py-2.5 text-sm font-semibold border-0 cursor-pointer hover:bg-[#245a42] transition-colors disabled:opacity-50"
            >
              {loadingMasivo ? "Asignando..." : `Asignar ${empleadosSeleccionados.length > 0 ? `(${empleadosSeleccionados.length})` : ""}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
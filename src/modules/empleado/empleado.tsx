import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import { isActiveStatus, isInactiveStatus, normalizeEstadoOperativo } from "@/utils/productionFlow";

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
type EmpleadoForm = Omit<Empleado, "id"> & { password: string };

const empty: EmpleadoForm = {
  primerNombre: "", segundoNombre: "", primerApellido: "", segundoApellido: "",
  email: "", password: "", codigoEmpleado: "", pstPuesto: null, estado: "ACTIVO",
};

const fetchEmpleados = () => api.get<{ data: Empleado[] }>("/empleados").then(r => r.data.data);
const fetchPuestos = () => api.get<{ data: Puesto[] }>("/position-workers").then(r => r.data.data);

export default function EmpleadoModule() {
  const qc = useQueryClient();
  const [form, setForm] = useState<EmpleadoForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPuesto, setFilterPuesto] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  const { data = [], isLoading } = useQuery({ queryKey: ["empleados"], queryFn: fetchEmpleados });
  const { data: puestos = [] } = useQuery({ queryKey: ["puestos"], queryFn: fetchPuestos });

  const filtered = useMemo(() => data.filter(e => {
    const nombre = `${e.primerNombre} ${e.primerApellido} ${e.codigoEmpleado ?? ""}`.toLowerCase();
    const matchSearch = !search || nombre.includes(search.toLowerCase());
    const matchPuesto = !filterPuesto || String(e.pstPuesto) === filterPuesto;
    const matchEstado = !filterEstado || normalizeEstadoOperativo(e.estado) === normalizeEstadoOperativo(filterEstado);
    return matchSearch && matchPuesto && matchEstado;
  }), [data, search, filterPuesto, filterEstado]);

  const activos = data.filter(e => isActiveStatus(e.estado)).length;
  const inactivos = data.filter(e => isInactiveStatus(e.estado)).length;

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["empleados"] }); reset(); };
  const create = useMutation({ mutationFn: (d: EmpleadoForm) => api.post("/empleados", d), onSuccess: invalidate });
  const update = useMutation({ mutationFn: (d: EmpleadoForm) => api.put(`/empleados/${editId}`, d), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/empleados/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["empleados"] }) });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); };
  const edit = (e: Empleado) => {
    setForm({ ...e, password: "", segundoNombre: e.segundoNombre ?? "", segundoApellido: e.segundoApellido ?? "", codigoEmpleado: e.codigoEmpleado ?? "" });
    setEditId(e.id); setOpen(true);
  };
  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: name === "pstPuesto" ? (value ? Number(value) : null) : value }));
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };
  const getNombrePuesto = (id: number | null | undefined) => puestos.find(p => p.id === id)?.nombre ?? null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">Empleados</h1>
          <p className="text-sm text-gray-500 mt-1">Gestione la fuerza laboral, asigne roles y supervise el estado operativo.</p>
        </div>
        <button onClick={() => { reset(); setOpen(true); }} className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0">
          + Nuevo Empleado
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Plantilla", value: data.length, color: "text-gray-900" },
          { label: "Activos Ahora", value: activos, color: "text-[#2D6A4F]" },
          { label: "Inactivos", value: inactivos, color: "text-red-600" },
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
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 min-w-0"
        />
        <select value={filterPuesto} onChange={e => setFilterPuesto(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 bg-white">
          <option value="">Puesto: Todos</option>
          {puestos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
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
                  {["Código", "Empleado", "Puesto", "Email", "Estado", "Acciones"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-500 font-semibold">{e.codigoEmpleado ?? "-"}</span>
                    </td>
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
                    <td className="px-4 py-3">
                      {getNombrePuesto(e.pstPuesto)
                        ? <Badge label={getNombrePuesto(e.pstPuesto)!} color="green" />
                        : <span className="text-xs text-gray-400">Sin puesto</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{e.email}</td>
                    <td className="px-4 py-3">
                      <Badge label={e.estado} color={isActiveStatus(e.estado) ? "green" : "gray"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => edit(e)} className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors" title="Editar">✏️</button>
                        <button onClick={() => remove.mutate(e.id)} className="bg-red-50 hover:bg-red-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors" title="Eliminar">🗑️</button>
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
            Mostrando {filtered.length} de {data.length} empleados
          </p>
        )}
      </div>

      {/* Modal */}
      <Modal open={open} title={editId ? "Editar Empleado" : "Registro de Empleado"} subtitle="Complete la información para integrar al nuevo miembro del equipo." onClose={reset}>
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "codigoEmpleado", label: "Código de Empleado", placeholder: "EMP-2024-", required: false },
              { name: "primerApellido", label: "Primer Apellido *", placeholder: "Ej. García", required: true },
              { name: "primerNombre", label: "Primer Nombre *", placeholder: "Ej. Roberto", required: true },
              { name: "segundoApellido", label: "Segundo Apellido", placeholder: "Ej. Méndez", required: false },
              { name: "segundoNombre", label: "Segundo Nombre", placeholder: "Ej. Antonio", required: false },
              { name: "email", label: "Correo Electrónico *", placeholder: "nombre@tpm-agri.com", required: true },
            ].map(f => (
              <label key={f.name} className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {f.label}
                <input name={f.name} placeholder={f.placeholder} value={(form as any)[f.name] ?? ""} onChange={change} required={f.required} type={f.name === "email" ? "email" : "text"} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal" />
              </label>
            ))}
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {editId ? "Nueva Contraseña (opcional)" : "Contraseña Temporal *"}
              <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={change} required={!editId} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Puesto Asignado
              <select name="pstPuesto" value={form.pstPuesto ?? ""} onChange={change} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white font-normal normal-case tracking-normal">
                <option value="">Seleccione puesto...</option>
                {puestos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Estado Inicial
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
              {editId ? "Actualizar Empleado" : "Guardar Empleado"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
} 
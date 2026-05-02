import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";

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
  const [form, setForm] = useState<AsignacionForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({ queryKey: ["asignaciones-orden-cuadrilla"], queryFn: fetcherAsignaciones });
  const { data: ordenes = [] } = useQuery({ queryKey: ["ordenes-trabajo"], queryFn: fetcherOrdenes });
  const { data: cuadrillas = [] } = useQuery({ queryKey: ["cuadrillas"], queryFn: fetcherCuadrillas });

  const activas = data.filter(a => a.estado === "activo").length;
  const inactivas = data.filter(a => a.estado === "inactivo").length;

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["asignaciones-orden-cuadrilla"] }); reset(); };
  const create = useMutation({ mutationFn: (d: AsignacionForm) => api.post("/asignaciones-orden-cuadrilla", d), onSuccess: invalidate });
  const update = useMutation({ mutationFn: (d: AsignacionForm) => api.put(`/asignaciones-orden-cuadrilla/${editId}`, d), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/asignaciones-orden-cuadrilla/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["asignaciones-orden-cuadrilla"] }) });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); };

  const edit = (a: AsignacionOrdenCuadrilla) => {
    const orden = ordenes.find(o => o.id === a.ordenTrabajoId);
    setForm({ ordenTrabajoId: a.ordenTrabajoId, cuadrillaId: a.cuadrillaId, cantidadAsignada: orden?.cantidadRequerida ?? a.cantidadAsignada, estado: a.estado });
    setEditId(a.id); setOpen(true);
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
  const getOrdenNumero = (id: number) => ordenes.find(o => o.id === id)?.numeroOrden ?? "-";
  const getCuadrillaName = (id: number) => cuadrillas.find(c => c.id === id)?.nombre ?? "-";

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">Asignación de Orden a Cuadrilla</h1>
          <p className="text-sm text-gray-500 mt-1">Distribución de órdenes de trabajo entre cuadrillas de producción.</p>
        </div>
        <button onClick={() => { reset(); setOpen(true); }} className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0">
          + Nueva Asignación
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Asignaciones", value: data.length, color: "text-gray-900" },
          { label: "Activas", value: activas, color: "text-[#2D6A4F]" },
          { label: "Inactivas", value: inactivas, color: "text-red-600" },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <p className="text-center py-12 text-gray-400">Cargando...</p>
        ) : data.length === 0 ? (
          <p className="text-center py-12 text-gray-400">Sin registros</p>
        ) : (
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
                {data.map((a, i) => (
                  <tr key={a.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-500">Orden - {getOrdenNumero(a.ordenTrabajoId)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{getCuadrillaName(a.cuadrillaId)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.cantidadAsignada}</td>
                    <td className="px-4 py-3">
                      <Badge label={a.estado.toUpperCase()} color={a.estado === "activo" ? "green" : "gray"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => edit(a)} className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors" title="Editar">✏️</button>
                        <button onClick={() => remove.mutate(a.id)} className="bg-red-50 hover:bg-red-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors" title="Eliminar">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.length > 0 && (
          <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Mostrando {data.length} asignación(es)
          </p>
        )}
      </div>

      {/* Modal */}
      <Modal open={open} title={editId ? "Editar Asignación" : "Nueva Asignación"} subtitle="Asigne una orden de trabajo a una cuadrilla de producción." onClose={reset}>
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Orden de trabajo *
              <select name="ordenTrabajoId" value={form.ordenTrabajoId} onChange={change} required className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white font-normal normal-case tracking-normal">
                <option value={0}>Seleccionar orden</option>
                {ordenes.map(o => <option key={o.id} value={o.id}>Orden - {o.numeroOrden}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cuadrilla *
              <select name="cuadrillaId" value={form.cuadrillaId} onChange={change} required className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white font-normal normal-case tracking-normal">
                <option value={0}>Seleccionar cuadrilla</option>
                {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cantidad asignada
              <input
                name="cantidadAsignada" type="number" value={form.cantidadAsignada} readOnly
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal bg-gray-100 cursor-not-allowed"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Estado
              <div className="flex gap-4 mt-1">
                {["activo", "inactivo"].map(est => (
                  <label key={est} className="flex items-center gap-2 cursor-pointer text-sm font-normal normal-case tracking-normal text-gray-700">
                    <input type="radio" name="estado" value={est} checked={form.estado === est} onChange={change} />
                    {est.charAt(0).toUpperCase() + est.slice(1)}
                  </label>
                ))}
              </div>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
            <button type="button" onClick={reset} className="bg-white text-gray-900 border border-gray-200 rounded-lg px-5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending || update.isPending} className="bg-[#2D6A4F] text-white rounded-lg px-5 py-2.5 text-sm font-semibold border-0 cursor-pointer hover:bg-[#245a42] transition-colors disabled:opacity-50">
              {editId ? "Actualizar Asignación" : "Guardar Asignación"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
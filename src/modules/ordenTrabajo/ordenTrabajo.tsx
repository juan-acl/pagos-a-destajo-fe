import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";

type Medida = { id: number; nombre: string; iniciales: string; };
type OrdenTrabajo = {
  id: number; numeroOrden: string; cantidadRequerida: number;
  medidaId?: number | null; pagoUnitario: number;
  fechaLimite?: string | null; estado: string;
};
type OrdenTrabajoForm = Omit<OrdenTrabajo, "id">;

const empty: OrdenTrabajoForm = {
  numeroOrden: "", cantidadRequerida: 0, medidaId: null,
  pagoUnitario: 0, fechaLimite: "", estado: "activo",
};

const fetcherOrdenes = () => api.get<{ data: OrdenTrabajo[] }>("/ordenes-trabajo").then(r => r.data.data);
const fetcherMedidas = () => api.get<{ data: Medida[] }>("/medidas").then(r => r.data.data);

export default function OrdenTrabajo() {
  const qc = useQueryClient();
  const [form, setForm] = useState<OrdenTrabajoForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({ queryKey: ["ordenes-trabajo"], queryFn: fetcherOrdenes });
  const { data: medidas = [] } = useQuery({ queryKey: ["medidas"], queryFn: fetcherMedidas });

  const activas = data.filter(o => o.estado === "activo").length;
  const inactivas = data.filter(o => o.estado === "inactivo").length;

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["ordenes-trabajo"] }); reset(); };
  const create = useMutation({ mutationFn: (d: OrdenTrabajoForm) => api.post("/ordenes-trabajo", d), onSuccess: invalidate });
  const update = useMutation({ mutationFn: (d: OrdenTrabajoForm) => api.put(`/ordenes-trabajo/${editId}`, d), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/ordenes-trabajo/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["ordenes-trabajo"] }) });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); };
  const edit = (o: OrdenTrabajo) => {
    setForm({ numeroOrden: o.numeroOrden, cantidadRequerida: o.cantidadRequerida, medidaId: o.medidaId ?? null, pagoUnitario: o.pagoUnitario, fechaLimite: o.fechaLimite ?? "", estado: o.estado });
    setEditId(o.id); setOpen(true);
  };
  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: name === "cantidadRequerida" || name === "pagoUnitario" || name === "medidaId" ? value === "" ? null : Number(value) : value }));
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };
  const getMedidaNombre = (id?: number | null) => medidas.find(m => m.id === id)?.nombre ?? "-";

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">Órdenes de Trabajo</h1>
          <p className="text-sm text-gray-500 mt-1">Creación y seguimiento de órdenes de producción.</p>
        </div>
        <button onClick={() => { reset(); setOpen(true); }} className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0">
          + Nueva Orden
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Órdenes", value: data.length, color: "text-gray-900" },
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
                  {["N° Orden", "Cantidad", "Medida", "Pago unitario", "Fecha límite", "Estado", "Acciones"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((o, i) => (
                  <tr key={o.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-500">{o.numeroOrden}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{o.cantidadRequerida}</td>
                    <td className="px-4 py-3">
                      <Badge label={getMedidaNombre(o.medidaId)} color="blue" />
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">Q {Number(o.pagoUnitario).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{o.fechaLimite ? new Date(o.fechaLimite).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3">
                      <Badge label={o.estado.toUpperCase()} color={o.estado === "activo" ? "green" : "gray"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => edit(o)} className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors" title="Editar">✏️</button>
                        <button onClick={() => remove.mutate(o.id)} className="bg-red-50 hover:bg-red-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors" title="Eliminar">🗑️</button>
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
            Mostrando {data.length} orden(es) de trabajo
          </p>
        )}
      </div>

      {/* Modal */}
      <Modal open={open} title={editId ? "Editar Orden de Trabajo" : "Nueva Orden de Trabajo"} subtitle="Complete la información para registrar la orden de producción." onClose={reset}>
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Número de orden *
              <input name="numeroOrden" value={form.numeroOrden} onChange={change} required placeholder="Ej. ORD-2026-001" className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cantidad requerida *
              <input name="cantidadRequerida" type="number" value={form.cantidadRequerida} onChange={change} required min={1} placeholder="Ej. 500" className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Medida
              <select name="medidaId" value={form.medidaId ?? ""} onChange={change} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white font-normal normal-case tracking-normal">
                <option value="">Sin medida</option>
                {medidas.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.iniciales})</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Pago unitario *
              <input name="pagoUnitario" type="number" value={form.pagoUnitario} onChange={change} required min={0} step="0.01" placeholder="Ej. 2.50" className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Fecha límite
              <input name="fechaLimite" type="date" value={form.fechaLimite ?? ""} onChange={change} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal" />
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
              {editId ? "Actualizar Orden" : "Guardar Orden"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
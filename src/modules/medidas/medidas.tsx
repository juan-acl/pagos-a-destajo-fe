import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";

type Medida = { id: number; nombre: string; iniciales: string; };
type MedidaForm = Omit<Medida, "id">;

const empty: MedidaForm = { nombre: "", iniciales: "" };
const fetcher = () => api.get<{ data: Medida[] }>("/medidas").then(r => r.data.data);

export default function Medidas() {
  const qc = useQueryClient();
  const [form, setForm] = useState<MedidaForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({ queryKey: ["medidas"], queryFn: fetcher });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["medidas"] }); reset(); };
  const create = useMutation({ mutationFn: (d: MedidaForm) => api.post("/medidas", d), onSuccess: invalidate });
  const update = useMutation({ mutationFn: (d: MedidaForm) => api.put(`/medidas/${editId}`, d), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/medidas/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["medidas"] }) });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); };
  const edit = (m: Medida) => { setForm({ nombre: m.nombre, iniciales: m.iniciales }); setEditId(m.id); setOpen(true); };
  const change = (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">Medidas</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de unidades de medida utilizadas en las órdenes de producción.</p>
        </div>
        <button onClick={() => { reset(); setOpen(true); }} className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0">
          + Nueva Medida
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[
          { label: "Total Medidas", value: data.length, color: "text-gray-900" },
          { label: "Registradas", value: data.length, color: "text-[#2D6A4F]" },
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
                  {["Nombre", "Iniciales", "Acciones"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((m, i) => (
                  <tr key={m.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{m.nombre}</td>
                    <td className="px-4 py-3">
                      <Badge label={m.iniciales} color="blue" />
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
        {data.length > 0 && (
          <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            {data.length} unidad(es) de medida registrada(s)
          </p>
        )}
      </div>

      {/* Modal */}
      <Modal open={open} title={editId ? "Editar Medida" : "Nueva Medida"} subtitle="Complete la información de la unidad de medida." onClose={reset}>
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Nombre *
              <input name="nombre" value={form.nombre} onChange={change} required placeholder="Ej. Kilogramo" className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Iniciales *
              <input name="iniciales" value={form.iniciales} onChange={change} required placeholder="Ej. kg" className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal" />
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
            <button type="button" onClick={reset} className="bg-white text-gray-900 border border-gray-200 rounded-lg px-5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending || update.isPending} className="bg-[#2D6A4F] text-white rounded-lg px-5 py-2.5 text-sm font-semibold border-0 cursor-pointer hover:bg-[#245a42] transition-colors disabled:opacity-50">
              {editId ? "Actualizar Medida" : "Guardar Medida"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
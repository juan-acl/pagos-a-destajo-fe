import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";

type Area = { id: number; nombre: string; };
type Cuadrilla = {
  id: number;
  nombre: string;
  codigoCuadrilla?: string | null;
  areaId?: number | null;
  estado: string;
};
type CuadrillaForm = Omit<Cuadrilla, "id">;

const empty: CuadrillaForm = { nombre: "", codigoCuadrilla: "", areaId: null, estado: "ACTIVO" };

const fetchCuadrillas = () => api.get<{ data: Cuadrilla[] }>("/cuadrillas").then(r => r.data.data);
const fetchAreas = () => api.get<{ data: Area[] }>("/area").then(r => r.data.data);

export default function CuadrillaModule() {
  const qc = useQueryClient();
  const [form, setForm] = useState<CuadrillaForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  const { data = [], isLoading } = useQuery({ queryKey: ["cuadrillas"], queryFn: fetchCuadrillas });
  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: fetchAreas });

  const filtered = useMemo(() => data.filter(c => {
    const texto = `${c.nombre} ${c.codigoCuadrilla ?? ""}`.toLowerCase();
    const matchSearch = !search || texto.includes(search.toLowerCase());
    const matchEstado = !filterEstado || c.estado === filterEstado;
    return matchSearch && matchEstado;
  }), [data, search, filterEstado]);

  const activas = data.filter(c => c.estado === "ACTIVO").length;
  const inactivas = data.filter(c => c.estado === "INACTIVO").length;

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["cuadrillas"] }); reset(); };
  const create = useMutation({ mutationFn: (d: CuadrillaForm) => api.post("/cuadrillas", d), onSuccess: invalidate });
  const update = useMutation({ mutationFn: (d: CuadrillaForm) => api.put(`/cuadrillas/${editId}`, d), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/cuadrillas/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["cuadrillas"] }) });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); };
  const edit = (c: Cuadrilla) => {
    setForm({ nombre: c.nombre, codigoCuadrilla: c.codigoCuadrilla ?? "", areaId: c.areaId ?? null, estado: c.estado });
    setEditId(c.id); setOpen(true);
  };
  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: name === "areaId" ? (value ? Number(value) : null) : value }));
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };
  const getNombreArea = (id: number | null | undefined) => areas.find(a => a.id === id)?.nombre ?? null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">Cuadrillas</h1>
          <p className="text-sm text-gray-500 mt-1">Gestione los grupos de trabajo y supervise su estado operativo.</p>
        </div>
        <button onClick={() => { reset(); setOpen(true); }} className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0">
          + Nueva Cuadrilla
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Cuadrillas", value: data.length, color: "text-gray-900" },
          { label: "Activas", value: activas, color: "text-[#2D6A4F]" },
          { label: "Inactivas", value: inactivas, color: "text-red-600" },
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
                  {["Código", "Cuadrilla", "Área", "Estado", "Acciones"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-500 font-semibold">{c.codigoCuadrilla ?? "-"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-semibold text-gray-900">{c.nombre}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getNombreArea(c.areaId)
                        ? <Badge label={getNombreArea(c.areaId)!} color="amber" />
                        : <span className="text-xs text-gray-400">Sin área</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={c.estado} color={c.estado === "ACTIVO" ? "green" : "gray"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => edit(c)} className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors" title="Editar">✏️</button>
                        <button onClick={() => remove.mutate(c.id)} className="bg-red-50 hover:bg-red-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors" title="Eliminar">🗑️</button>
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
            Mostrando {filtered.length} de {data.length} cuadrillas
          </p>
        )}
      </div>

      {/* Modal */}
      <Modal open={open} title={editId ? "Editar Cuadrilla" : "Nueva Cuadrilla"} subtitle="Complete la información para registrar la cuadrilla." onClose={reset}>
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Nombre *
              <input name="nombre" placeholder="Ej. Cuadrilla Norte" value={form.nombre} onChange={change} required className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Código
              <input name="codigoCuadrilla" placeholder="Ej. CUA-001" value={form.codigoCuadrilla ?? ""} onChange={change} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Área
              <select name="areaId" value={form.areaId ?? ""} onChange={change} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white font-normal normal-case tracking-normal">
                <option value="">Sin área</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
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
              {editId ? "Actualizar" : "Guardar Cuadrilla"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
import { useState, useMemo } from "react";
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
type OrdenTrabajoForm = Omit<OrdenTrabajo, "id" | "numeroOrden">;

const ITEMS_PER_PAGE = 10;

const empty: OrdenTrabajoForm = {
  cantidadRequerida: 0, medidaId: null,
  pagoUnitario: 0, fechaLimite: "", estado: "activo",
};

const fetcherOrdenes = () => api.get<{ data: OrdenTrabajo[] }>("/ordenes-trabajo").then(r => r.data.data);
const fetcherMedidas = () => api.get<{ data: Medida[] }>("/medidas").then(r => r.data.data);

export default function OrdenTrabajo() {
  const qc = useQueryClient();
  const [form, setForm] = useState<OrdenTrabajoForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data = [], isLoading } = useQuery({ queryKey: ["ordenes-trabajo"], queryFn: fetcherOrdenes });
  const { data: medidas = [] } = useQuery({ queryKey: ["medidas"], queryFn: fetcherMedidas });

  const activas = data.filter(o => o.estado === "activo").length;
  const inactivas = data.filter(o => o.estado === "inactivo").length;
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => data.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE), [data, page]);

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["ordenes-trabajo"] }); reset(); };

  const create = useMutation({
    mutationFn: (d: OrdenTrabajoForm) => api.post("/ordenes-trabajo", d),
    onSuccess: invalidate,
    onError: (e: any) => setError(e?.response?.data?.message ?? "Error al guardar la orden. Verifica los campos e intenta de nuevo."),
  });

  const update = useMutation({
    mutationFn: (d: OrdenTrabajoForm) => api.put(`/ordenes-trabajo/${editId}`, d),
    onSuccess: invalidate,
    onError: (e: any) => setError(e?.response?.data?.message ?? "Error al actualizar la orden."),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/ordenes-trabajo/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordenes-trabajo"] }),
    onError: (e: any) => setError(e?.response?.data?.message ?? "Error al eliminar la orden."),
  });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); setError(null); };

  const edit = (o: OrdenTrabajo) => {
    setForm({ cantidadRequerida: o.cantidadRequerida, medidaId: o.medidaId ?? null, pagoUnitario: o.pagoUnitario, fechaLimite: o.fechaLimite ?? "", estado: o.estado });
    setEditId(o.id); setOpen(true); setError(null);
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: name === "cantidadRequerida" || name === "pagoUnitario" || name === "medidaId" ? value === "" ? null : Number(value) : value }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.cantidadRequerida || form.cantidadRequerida <= 0) {
      setError("La cantidad requerida debe ser mayor a cero.");
      return;
    }
    if (!form.pagoUnitario || form.pagoUnitario <= 0) {
      setError("El pago unitario debe ser mayor a cero.");
      return;
    }
    editId ? update.mutate(form) : create.mutate(form);
  };

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

      {/* Error global */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600 border-0 bg-transparent cursor-pointer text-lg">×</button>
        </div>
      )}

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
                {paginated.map((o, i) => (
                  <tr key={o.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-500">{o.numeroOrden}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{o.cantidadRequerida}</td>
                    <td className="px-4 py-3"><Badge label={getMedidaNombre(o.medidaId)} color="blue" /></td>
                    <td className="px-4 py-3 font-semibold text-gray-900">Q {Number(o.pagoUnitario).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{o.fechaLimite ? new Date(o.fechaLimite).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3"><Badge label={o.estado.toUpperCase()} color={o.estado === "activo" ? "green" : "gray"} /></td>
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, data.length)} de {data.length} órdenes
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40 cursor-pointer hover:bg-gray-50"
              >
                ← Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer ${n === page ? "bg-[#2D6A4F] text-white border-[#2D6A4F]" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40 cursor-pointer hover:bg-gray-50"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {totalPages <= 1 && data.length > 0 && (
          <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Mostrando {data.length} orden(es) de trabajo
          </p>
        )}
      </div>

      {/* Modal */}
      <Modal open={open} title={editId ? "Editar Orden de Trabajo" : "Nueva Orden de Trabajo"} subtitle="El número de orden se genera automáticamente al guardar." onClose={reset}>
        <form onSubmit={submit}>

          {/* Error dentro del modal */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex justify-between items-center">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600 border-0 bg-transparent cursor-pointer text-lg">×</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editId && (
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide sm:col-span-2">
                Número de orden
                <input
                  value={data.find(o => o.id === editId)?.numeroOrden ?? ""}
                  readOnly
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 outline-none bg-gray-50 cursor-not-allowed font-normal normal-case tracking-normal"
                />
              </label>
            )}
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
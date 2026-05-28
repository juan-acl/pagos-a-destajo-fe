import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ruler, Plus, HelpCircle, Pencil, Trash2, Search } from "lucide-react";
import api from "@/api";
import { getErrorMessage } from "@/utils/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import ToastContainer from "@/components/ui/Toastcontainer";
import { useToast } from "@/hooks/useToast";
import { useTour } from "@/hooks/useTour";
import { useTooltip } from "@/hooks/useTooltip";
import { useAuthStore } from "@/store/authStore";
import { validateMedida, hasErrors, type Errors } from "@/utils/validators";
import { MEDIDAS_TOUR_STEPS } from "./tour";

const ITEMS_PER_PAGE = 10;

type Medida = { id: number; nombre: string; iniciales: string; };
type MedidaForm = Omit<Medida, "id">;
const empty: MedidaForm = { nombre: "", iniciales: "" };

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

const fetcher = () => api.get<{ data: Medida[] }>("/medidas").then(r => r.data.data);

export default function Medidas() {
  const qc = useQueryClient();
  const { empleado: authEmpleado } = useAuthStore();
  const [form, setForm] = useState<MedidaForm>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { toasts, show, remove } = useToast();
  const { startTour } = useTour(MEDIDAS_TOUR_STEPS, "medidas", authEmpleado?.id);

  const tourKey = authEmpleado?.id != null ? `pad_tour_medidas_v1_${authEmpleado.id}` : null;
  const [tourDone, setTourDone] = useState(() => tourKey ? localStorage.getItem(tourKey) === "1" : false);
  useEffect(() => {
    if (!tourKey || tourDone) return;
    const interval = setInterval(() => {
      if (localStorage.getItem(tourKey) === "1") setTourDone(true);
    }, 500);
    return () => clearInterval(interval);
  }, [tourKey, tourDone]);

  const { data = [], isLoading } = useQuery({ queryKey: ["medidas"], queryFn: fetcher });

  const filtered = useMemo(() => data.filter(m => {
    const texto = `${m.nombre} ${m.iniciales}`.toLowerCase();
    return !search || texto.includes(search.toLowerCase());
  }), [data, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filtered, page],
  );

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); setErrors({}); };
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["medidas"] }); reset(); show("Medida guardada correctamente.", "success"); };

  const create = useMutation({
    mutationFn: (d: MedidaForm) => api.post("/medidas", d),
    onSuccess: invalidate,
    onError: (err) => show(getErrorMessage(err), "error"),
  });
  const update = useMutation({
    mutationFn: (d: MedidaForm) => api.put(`/medidas/${editId}`, d),
    onSuccess: invalidate,
    onError: (err) => show(getErrorMessage(err), "error"),
  });
  const remove2 = useMutation({
    mutationFn: (id: number) => api.delete(`/medidas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["medidas"] }); show("Medida eliminada.", "success"); },
    onError: (err) => show(getErrorMessage(err), "error"),
  });

  const edit = (m: Medida) => { setForm({ nombre: m.nombre, iniciales: m.iniciales }); setEditId(m.id); setErrors({}); setOpen(true); };

  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateMedida(form);
    if (hasErrors(errs)) { setErrors(errs); return; }
    editId ? update.mutate(form) : create.mutate(form);
  };

  const inputCls = (field: string) =>
    `border rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal w-full ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"}`;

  return (
    <div className="max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={remove} />

      {/* Header */}
      <div id="medidas-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div className="flex items-center gap-3">
          <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ruler size={22} color="#2D6A4F" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 m-0">Medidas</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión de unidades de medida utilizadas en las órdenes de producción.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={startTour}
            className="bg-white text-[#2D6A4F] text-sm font-semibold px-5 py-2.5 rounded-lg border border-[#2D6A4F] hover:bg-green-50 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2">
            <HelpCircle size={15} color="#2D6A4F" />
            ¿Necesitas ayuda?
          </button>
          <button id="medidas-nuevo-btn" onClick={() => { reset(); setOpen(true); }}
            className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0 flex items-center gap-2">
            <Plus size={16} />
            Nueva Medida
          </button>
        </div>
      </div>

      {/* Stats */}
      <div id="medidas-stats" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[
          { label: "Total Medidas", value: data.length, color: "text-gray-900", icon: "📏" },
          { label: "Registradas", value: data.length, color: "text-[#2D6A4F]", icon: "✅" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{s.icon}</span>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div id="medidas-filtros" className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative min-w-0">
          <Search size={15} color="#9ca3af" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input placeholder="Buscar por nombre o iniciales..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none text-gray-900" />
        </div>
      </div>

      {/* Tabla */}
      <div id="medidas-tabla" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? <p className="text-center py-12 text-gray-400">Cargando...</p>
          : filtered.length === 0 ? <p className="text-center py-12 text-gray-400">Sin resultados</p>
          : (
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
                  {paginated.map((m, i) => (
                    <tr key={m.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Ruler size={14} color="#2D6A4F" />
                          <span className="font-medium text-gray-900">{m.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge label={m.iniciales} color="blue" /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => edit(m)} title="Editar medida"
                            className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors flex items-center gap-1">
                            <Pencil size={13} color="#d97706" />
                          </button>
                          <button onClick={() => remove2.mutate(m.id)} title="Eliminar medida"
                            className="bg-red-50 hover:bg-red-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors flex items-center gap-1">
                            <Trash2 size={13} color="#dc2626" />
                          </button>
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
              Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} medidas
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
          <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">Mostrando {filtered.length} de {data.length} medidas</p>
        )}
      </div>

      {/* Modal */}
      <Modal open={open} title={editId ? "✏️ Editar Medida" : "📏 Nueva Medida"} subtitle="Complete la información de la unidad de medida." onClose={reset}>
        <form onSubmit={submit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Nombre *
                {tourDone && <TipIcon element="#f-med-nombre" title="Nombre" description="Nombre completo de la unidad de medida. Ej: Kilogramo, Metro, Milla. Máximo 100 caracteres." />}
              </label>
              <input id="f-med-nombre" name="nombre" placeholder="Ej. Kilogramo" value={form.nombre} onChange={change} className={inputCls("nombre")} />
              <FieldError msg={errors.nombre} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center">
                Iniciales *
                {tourDone && <TipIcon element="#f-med-iniciales" title="Iniciales" description="Abreviatura de la unidad de medida. Ej: kg, m, mi. Máximo 10 caracteres." />}
              </label>
              <input id="f-med-iniciales" name="iniciales" placeholder="Ej. kg" value={form.iniciales} onChange={change} className={inputCls("iniciales")} />
              <FieldError msg={errors.iniciales} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
            <button type="button" onClick={reset} className="bg-white text-gray-900 border border-gray-200 rounded-lg px-5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={create.isPending || update.isPending}
              className="bg-[#2D6A4F] text-white rounded-lg px-5 py-2.5 text-sm font-semibold border-0 cursor-pointer hover:bg-[#245a42] transition-colors disabled:opacity-50 flex items-center gap-2">
              {editId ? <><Pencil size={14} /> Actualizar Medida</> : <><Plus size={14} /> Guardar Medida</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
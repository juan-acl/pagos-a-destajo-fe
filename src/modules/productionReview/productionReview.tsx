import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Toast from "@/components/ui/Toast";
import Pagination from "@/components/ui/Pagination";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";
import { Search } from "lucide-react";

type PendingReport = {
  id: number;
  reporteId: number;
  estado: string;
  empleadoNombre: string;
  empleadoId?: number | null;
  asignacionOrdenCuadrillaId: number | null;
  ordenTrabajoId: number | null;
  cantidadReportada: number;
  cantidadRecibida: number;
  fechaReporte?: string;
  modalidad?: string;
  orden?: {
    id: number;
    numeroOrden: string;
    estado: string;
    modalidad?: string;
    pagoUnitario?: number;
  } | null;
  cuadrilla?: {
    id: number;
    nombre?: string;
    codigoCuadrilla?: string | null;
  } | null;
};

type ProductionReview = {
  id: number;
  cantidadRecibida: number;
  cantidadAprobada: number;
  porcentajeRechazo: number;
  estadoRevision: string;
  observaciones?: string | null;
  fechaRevision: string;
  assignment?: PendingReport | null;
};

const fetchPending = () =>
  api
    .get<ApiEnvelope<PendingReport[]>>("/production-review/pending")
    .then((response) => response.data.data);

const fetchReviews = () =>
  api.get<ApiEnvelope<ProductionReview[]>>("/production-review").then((r) => r.data.data);

const normalize = (value?: string | null) => String(value ?? "").trim().toUpperCase();

const DISPLAY_LIMIT = 10;

const paginate = <T,>(items: T[], page: number) => {
  const totalPages = Math.max(1, Math.ceil(items.length / DISPLAY_LIMIT));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * DISPLAY_LIMIT;
  return items.slice(start, start + DISPLAY_LIMIT);
};

const badgeColor = (estado: string) => {
  const value = normalize(estado);
  if (value === "APROBADA" || value === "APROBADO") return "green";
  if (value === "OBSERVADA" || value === "OBSERVADO") return "red";
  if (value === "PENDIENTE_REVISION") return "amber";
  return "gray";
};

export default function ProductionReviewPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [cantidadAprobada, setCantidadAprobada] = useState<number | "">("");
  const [observaciones, setObservaciones] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [reviewsPage, setReviewsPage] = useState(1);

  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ["production-review-pending"],
    queryFn: fetchPending,
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["production-review"],
    queryFn: fetchReviews,
  });

  const selectedReport = useMemo(
    () => pending.find((item) => item.reporteId === Number(selectedId)) ?? null,
    [pending, selectedId],
  );

  const visibleReviews = useMemo(
    () => paginate(reviews, reviewsPage),
    [reviews, reviewsPage],
  );

  const cantidadRecibida = Number(selectedReport?.cantidadReportada ?? selectedReport?.cantidadRecibida ?? 0);

  // CORREGIDO: Eliminada la dependencia e instrucción rota que causaba el crash de la aplicación
  const porcentajeRechazo = useMemo(() => {
    if (!cantidadRecibida || cantidadRecibida <= 0) return 0;
    return Number((((cantidadRecibida - Number(cantidadAprobada || 0)) / cantidadRecibida) * 100).toFixed(2));
  }, [cantidadRecibida, cantidadAprobada]);

  const estadoResultante = porcentajeRechazo <= 20 ? "APROBADA" : "OBSERVADA";
  const observacionObligatoria = estadoResultante === "OBSERVADA";

  const reset = () => {
    setSelectedId("");
    setCantidadAprobada("");
    setObservaciones("");
    setMessage(null);
  };

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["production-review-pending"] }),
      qc.invalidateQueries({ queryKey: ["production-review"] }),
      qc.invalidateQueries({ queryKey: ["employee-assignment"] }),
      qc.invalidateQueries({ queryKey: ["employee-assignment-panels"] }),
      qc.invalidateQueries({ queryKey: ["production-lot-candidates"] }),
    ]);
    reset();
  };

  const create = useMutation({
    mutationFn: async () =>
      api.post("/production-review", {
        reporteId: Number(selectedId),
        asignacionEmpleadoId: selectedReport?.id,
        cantidadRecibida,
        cantidadAprobada: Number(cantidadAprobada),
        observaciones: observaciones.trim() || undefined,
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const saveReview = () => {
    if (!selectedReport) {
      setMessage("Debes seleccionar un reporte pendiente.");
      return;
    }
    if (!cantidadRecibida || cantidadRecibida <= 0) {
      setMessage("La cantidad recibida debe ser mayor a cero.");
      return;
    }
    if (cantidadAprobada === "" || Number(cantidadAprobada) < 0) {
      setMessage("Debes ingresar una cantidad aprobada válida.");
      return;
    }
    if (Number(cantidadAprobada) > cantidadRecibida) {
      setMessage("La cantidad aprobada no puede ser mayor a la reportada/recibida.");
      return;
    }
    if (observacionObligatoria && !observaciones.trim()) {
      setMessage("Debes ingresar observaciones cuando el rechazo supera el 20%.");
      return;
    }
    setMessage(null);
    create.mutate();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-7">
        {/* Encabezado estructurado exactamente igual que la barra lateral */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-gray-50/50">
            <Search className="w-5 h-5 text-slate-500" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 m-0 tracking-tight">
            Revisión y Aprobación de Producción
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1.5 pl-[52px]">
          Revisa reportes reales del operario. Este flujo aplica únicamente a órdenes por DESTAJO.
        </p>
      </div>

      <Toast message={message} type="error" onClose={() => setMessage(null)} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Reportes pendientes", value: pending.length, color: "text-amber-600" },
          { label: "Revisadas", value: reviews.filter((item) => normalize(item.estadoRevision) !== "PENDIENTE_REVISION").length, color: "text-blue-600" },
          { label: "Aprobadas", value: reviews.filter((item) => normalize(item.estadoRevision) === "APROBADA").length, color: "text-[#2D6A4F]" },
          { label: "Observadas", value: reviews.filter((item) => normalize(item.estadoRevision) === "OBSERVADA").length, color: "text-red-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[380px,1fr] gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Reporte pendiente</label>
          <select
            value={selectedId}
            onChange={(e) => {
              const next = e.target.value === "" ? "" : Number(e.target.value);
              setSelectedId(next);
              setCantidadAprobada("");
              setObservaciones("");
              setMessage(null);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-emerald-600"
          >
            <option value="">Selecciona un reporte</option>
            {pending.map((item) => (
              <option key={item.reporteId} value={item.reporteId}>
                #{item.reporteId} · {item.empleadoNombre} · {item.orden?.numeroOrden ?? item.ordenTrabajoId ?? "-"} · {item.cantidadReportada} piezas
              </option>
            ))}
          </select>

          {selectedReport && (
            <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 space-y-1">
              <p>Empleado: <strong>{selectedReport.empleadoNombre}</strong></p>
              <p>Orden: <strong>{selectedReport.orden?.numeroOrden ?? selectedReport.ordenTrabajoId ?? "-"}</strong></p>
              <p>Cuadrilla: <strong>{selectedReport.cuadrilla?.nombre ?? "-"}</strong></p>
              <p>Modalidad: <strong>{selectedReport.modalidad ?? selectedReport.orden?.modalidad ?? "DESTAJO"}</strong></p>
              <p>Cantidad reportada: <strong>{selectedReport.cantidadReportada}</strong></p>
              <p>Reporte: <strong>#{selectedReport.reporteId}</strong></p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Cantidad recibida/reportada
              <input
                type="number"
                value={selectedReport ? cantidadRecibida : ""}
                readOnly
                className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50 focus:outline-none"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Cantidad aprobada
              <input
                type="number"
                min={0}
                max={cantidadRecibida || undefined}
                value={cantidadAprobada}
                onChange={(e) => setCantidadAprobada(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-emerald-600"
              />
            </label>
          </div>

          <div className="mt-4 rounded-lg border border-gray-100 p-4 bg-gray-50 text-sm text-gray-700 space-y-1">
            <p>Porcentaje de rechazo: <strong className={porcentajeRechazo <= 20 ? "text-[#2D6A4F]" : "text-red-600"}>{porcentajeRechazo}%</strong></p>
            <p>Estado resultante: <strong className={estadoResultante === "APROBADA" ? "text-[#2D6A4F]" : "text-red-600"}>{estadoResultante}</strong></p>
          </div>

          <label className="block text-sm font-medium text-gray-700 mt-4">
            Observaciones {observacionObligatoria ? "*" : ""}
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={4}
              className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-emerald-600"
              placeholder="Describe hallazgos o motivos de rechazo"
            />
          </label>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={saveReview}
              disabled={create.isPending}
              className="bg-[#2D6A4F] disabled:bg-gray-300 text-white text-sm font-semibold px-5 py-2.5 rounded-lg border-0 cursor-pointer"
            >
              Confirmar revisión
            </button>
            <button
              type="button"
              onClick={reset}
              className="bg-gray-100 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-lg border-0 cursor-pointer"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Historial de reportes y revisiones</h2>
          <p className="text-sm text-gray-500">Los reportes pendientes nacen desde el panel del operario y aquí se aprueban u observan.</p>
        </div>

        {loadingPending || loadingReviews ? (
          <p className="text-center py-12 text-gray-400">Cargando...</p>
        ) : reviews.length === 0 ? (
          <p className="text-center py-12 text-gray-400">Sin revisiones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {["Reporte", "Empleado", "Orden", "Recibida", "Aprobada", "% rechazo", "Estado", "Fecha"].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleReviews.map((item, index) => (
                  <tr key={item.id} className={`border-t border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-semibold text-gray-900">#{item.id}</td>
                    <td className="px-4 py-3 text-gray-700">{item.assignment?.empleadoNombre ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{item.assignment?.orden?.numeroOrden ?? item.assignment?.ordenTrabajoId ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-900">{item.cantidadRecibida}</td>
                    <td className="px-4 py-3 text-[#2D6A4F] font-semibold">{item.cantidadAprobada}</td>
                    <td className="px-4 py-3 text-gray-700">{item.porcentajeRechazo}%</td>
                    <td className="px-4 py-3"><Badge label={item.estadoRevision} color={badgeColor(item.estadoRevision) as any} /></td>
                    <td className="px-4 py-3 text-gray-500">{item.fechaRevision?.slice(0, 10) ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={reviewsPage}
              total={reviews.length}
              pageSize={DISPLAY_LIMIT}
              itemLabel="revisión(es)"
              onPageChange={setReviewsPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
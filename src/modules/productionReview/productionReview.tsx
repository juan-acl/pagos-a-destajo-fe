import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";

type PendingAssignment = {
  id: number;
  metaIndividual: number;
  estado: string;
  empleadoNombre: string;
  asignacionOrdenCuadrillaId: number | null;
  ordenTrabajoId: number | null;
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
  assignment?: PendingAssignment | null;
};
// ─── Fetchers ────────────────────────────────────────────────────────────────

const fetchPending = () =>
  api
    .get<ApiEnvelope<PendingAssignment[]>>("/production-review/pending")
    .then((response) => response.data.data);

const fetchReviews = () =>
  api.get<ApiEnvelope<ProductionReview[]>>("/production-review")
    .then(r => r.data.data);

// ─── Componente ──────────────────────────────────────────────────────────────

export default function ProductionReviewPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [cantidadRecibida, setCantidadRecibida] = useState<number | "">("");
  const [cantidadAprobada, setCantidadAprobada] = useState<number | "">("");
  const [observaciones, setObservaciones] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  // Queries
  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ["production-review-pending"],
    queryFn: fetchPending,
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["production-review"],
    queryFn: fetchReviews,
  });

  const selectedAssignment = useMemo(
    () => pending.find((item) => item.id === Number(selectedId)) ?? null,
    [pending, selectedId],
  );

  const porcentajeRechazo = useMemo(() => {
    if (!cantidadRecibida || Number(cantidadRecibida) <= 0) return 0;
    return Number((((Number(cantidadRecibida) - Number(cantidadAprobada || 0)) / Number(cantidadRecibida)) * 100).toFixed(2));
  }, [cantidadRecibida, cantidadAprobada]);

  const estadoResultante = porcentajeRechazo <= 20 ? "APROBADA" : "OBSERVADA";
  const observacionObligatoria = estadoResultante === "OBSERVADA";

  const reset = () => {
    setSelectedId("");
    setCantidadRecibida("");
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
        asignacionEmpleadoId: Number(selectedId),
        cantidadRecibida: Number(cantidadRecibida),
        cantidadAprobada: Number(cantidadAprobada),
        observaciones: observaciones.trim() || undefined,
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const saveReview = () => {
    if (!selectedAssignment) {
      setMessage("Debes seleccionar una asignación activa.");
      return;
    }
    if (!cantidadRecibida || Number(cantidadRecibida) <= 0) {
      setMessage("La cantidad recibida debe ser mayor a cero.");
      return;
    }
    if (Number(cantidadRecibida) > Number(selectedAssignment.metaIndividual)) {
      setMessage("La cantidad recibida no puede superar la meta asignada.");
      return;
    }
    if (Number(cantidadAprobada || 0) > Number(cantidadRecibida)) {
      setMessage("La cantidad aprobada no puede ser mayor a la recibida.");
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
        <h1 className="text-2xl font-bold text-gray-900 m-0">Revisión y Aprobación de Producción</h1>
        <p className="text-sm text-gray-500 mt-1">
          Procesa asignaciones activas, calcula el rechazo en tiempo real y bloquea lo que no cumple.
        </p>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pendientes", value: pending.length, color: "text-amber-600" },
          { label: "Revisadas", value: reviews.length, color: "text-blue-600" },
          { label: "Aprobadas", value: reviews.filter((item) => item.estadoRevision === "APROBADA").length, color: "text-[#2D6A4F]" },
          { label: "Observadas", value: reviews.filter((item) => item.estadoRevision === "OBSERVADA").length, color: "text-red-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[360px,1fr] gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Asignación activa</label>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value === "" ? "" : Number(e.target.value));
              setMessage(null);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
          >
            <option value="">Selecciona una asignación</option>
            {pending.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.id} · {item.empleadoNombre} · {item.cuadrilla?.nombre ?? "Sin cuadrilla"}
              </option>
            ))}
          </select>

          {selectedAssignment && (
            <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 space-y-1">
              <p>Empleado: <strong>{selectedAssignment.empleadoNombre}</strong></p>
              <p>Cuadrilla: <strong>{selectedAssignment.cuadrilla?.nombre ?? "-"}</strong></p>
              <p>Referencia de producción: <strong>{selectedAssignment.metaIndividual}</strong></p>
              <p>Asignación: <strong>#{selectedAssignment.id}</strong></p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Cantidad recibida
              <input
                type="number"
                min={0}
                value={cantidadRecibida}
                onChange={(e) => setCantidadRecibida(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Cantidad aprobada
              <input
                type="number"
                min={0}
                value={cantidadAprobada}
                onChange={(e) => setCantidadAprobada(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </label>
          </div>

          <div className="mt-4 rounded-lg border border-gray-100 p-4 bg-gray-50 text-sm text-gray-700 space-y-1">
            <p>
              Porcentaje de rechazo: <strong className={porcentajeRechazo <= 20 ? "text-[#2D6A4F]" : "text-red-600"}>{porcentajeRechazo}%</strong>
            </p>
            <p>
              Estado resultante: <strong className={estadoResultante === "APROBADA" ? "text-[#2D6A4F]" : "text-red-600"}>{estadoResultante}</strong>
            </p>
          </div>

          <label className="block text-sm font-medium text-gray-700 mt-4">
            Observaciones {observacionObligatoria ? "*" : ""}
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={4}
              className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
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
              className="bg-gray-100 text-gray-900 text-sm font-medium px-5 py-2.5 rounded-lg border-0 cursor-pointer"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Historial de revisiones</h2>
          <p className="text-sm text-gray-500">Muestra el cálculo temporal de rechazo y el estado resultante.</p>
        </div>

        {loadingPending || loadingReviews ? (
          <p className="text-center py-12 text-gray-400">Cargando...</p>
        ) : reviews.length === 0 ? (
          <p className="text-center py-12 text-gray-400">Aún no hay revisiones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {["Revisión", "Empleado", "Recibida", "Aprobada", "% Rechazo", "Estado", "Observaciones"].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviews.map((item, index) => (
                  <tr key={item.id} className={`border-t border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-semibold text-gray-900">#{item.id}</td>
                    <td className="px-4 py-3 text-gray-700">{item.assignment?.empleadoNombre ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-900">{item.cantidadRecibida}</td>
                    <td className="px-4 py-3 text-[#2D6A4F] font-semibold">{item.cantidadAprobada}</td>
                    <td className="px-4 py-3 text-gray-700">{item.porcentajeRechazo}%</td>
                    <td className="px-4 py-3">
                      <Badge label={item.estadoRevision} color={item.estadoRevision === "APROBADA" ? "green" : "red"} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.observaciones?.trim() || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

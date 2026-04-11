import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";

type LotCandidate = {
  id: number;
  cantidadAsignada: number;
  totalAprobado: number;
  montoTotal: number;
  canGenerate: boolean;
  blockers: string[];
  orden?: {
    id: number;
    numeroOrden: string;
    estado: string;
    cantidadRequerida: number;
    pagoUnitario: number;
  } | null;
  cuadrilla?: {
    id: number;
    nombre: string;
  } | null;
  pendingAssignments: { id: number; empleadoNombre: string }[];
  observedReviews: { id: number; assignment?: { empleadoNombre?: string } | null }[];
};

type ProductionLot = {
  id: number;
  numeroLote: string;
  totalPiezasAprobadas: number;
  fechaEnvio: string;
  estado: string;
  montoTotal: number;
  orden?: {
    id: number;
    numeroOrden: string;
  } | null;
  cuadrilla?: {
    id: number;
    nombre: string;
  } | null;
};

const fetchCandidates = () =>
  api
    .get<ApiEnvelope<LotCandidate[]>>("/production-lot/candidates")
    .then((response) => response.data.data);

const fetchLots = () =>
const fetchLots = () =>
  api
    .get<ApiEnvelope<ProductionLot[]>>("/production-lot")
    .then((response) => response.data.data);

const fetchReviews = () =>
  api
    .get<ApiEnvelope<ProductionReviewRef[]>>("/production-review")
    .then((response) => response.data.data);

export default function ProductionLotPage() {
  const qc = useQueryClient();
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | "">("");
  const [message, setMessage] = useState<string | null>(null);

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: ["production-lot-candidates"],
    queryFn: fetchCandidates,
  });

  const { data: lots = [], isLoading: loadingLots } = useQuery({
    queryKey: ["production-lot"],
    queryFn: fetchLots,
  });

  const getReviewId = (
    review: number | ProductionReviewRef | null | undefined,
  ) => {
    if (review == null) return null;
    return typeof review === "number" ? review : review.id;
  };

  const getReview = (
    review: number | ProductionReviewRef | null | undefined,
  ) => {
    if (review == null) return null;
    if (typeof review !== "number") return review;
    return reviews.find((item) => item.id === review) ?? null;
  };

  const getReviewLabel = (
    review: number | ProductionReviewRef | null | undefined,
  ) => {
    const reviewData = getReview(review);
    const reviewId = getReviewId(review);

    if (!reviewData) return reviewId ? `Revisión #${reviewId}` : "Sin revisión";

    return `Revisión #${reviewData.id}${
      reviewData.estadoRevision ? ` · ${reviewData.estadoRevision}` : ""
    }${
      reviewData.cantidadAprobada !== undefined
        ? ` · Aprobadas ${reviewData.cantidadAprobada}`
        : ""
    }`;
  };

  const reviewsDisponibles = useMemo(() => reviews, [reviews]);

  const selectedCandidate = useMemo(
    () => candidates.find((item) => item.id === Number(selectedCandidateId)) ?? null,
    [candidates, selectedCandidateId],
  );

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["production-lot-candidates"] }),
      qc.invalidateQueries({ queryKey: ["production-lot"] }),
      qc.invalidateQueries({ queryKey: ["production-review"] }),
      qc.invalidateQueries({ queryKey: ["production-review-pending"] }),
    ]);
  };

  const generate = useMutation({
    mutationFn: async () =>
      api.post("/production-lot/generate", {
        asignacionOrdenCuadrillaId: Number(selectedCandidateId),
      }),
    onSuccess: async () => {
      setMessage(null);
      await invalidate();
    },
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900 m-0">Generación de Lote</h1>
        <p className="text-sm text-gray-500 mt-1">
          Consolida revisiones aprobadas, muestra bloqueos y genera el lote temporal para enviar a gerencia.
        </p>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Paneles evaluados", value: candidates.length, color: "text-gray-900" },
          { label: "Listos para lote", value: candidates.filter((item) => item.canGenerate).length, color: "text-[#2D6A4F]" },
          { label: "Con bloqueos", value: candidates.filter((item) => !item.canGenerate).length, color: "text-red-600" },
          { label: "Lotes generados", value: lots.length, color: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[360px,1fr] gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Orden y cuadrilla</label>
          <select
            value={selectedCandidateId}
            onChange={(e) => {
              setSelectedCandidateId(e.target.value === "" ? "" : Number(e.target.value));
              setMessage(null);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
          >
            <option value="">Selecciona un panel</option>
            {candidates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.orden?.numeroOrden ?? `Orden #${item.orden?.id ?? "-"}`} · {item.cuadrilla?.nombre ?? "Sin cuadrilla"}
              </option>
            ))}
          </select>

          {selectedCandidate && (
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 space-y-1">
                <p>Orden: <strong>{selectedCandidate.orden?.numeroOrden ?? "-"}</strong></p>
                <p>Cuadrilla: <strong>{selectedCandidate.cuadrilla?.nombre ?? "-"}</strong></p>
                <p>Cantidad asignada: <strong>{selectedCandidate.cantidadAsignada}</strong></p>
                <p>Total aprobado: <strong className="text-[#2D6A4F]">{selectedCandidate.totalAprobado}</strong></p>
                <p>Monto temporal: <strong>Q {selectedCandidate.montoTotal.toFixed(2)}</strong></p>
              </div>

              <div className="rounded-lg border border-gray-100 p-4">
                <p className="font-semibold text-gray-900 mb-2">Precondiciones</p>
                {selectedCandidate.blockers.length === 0 ? (
                  <p className="text-[#2D6A4F]">Todo listo para generar el lote.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1 text-red-600">
                    {selectedCandidate.blockers.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="button"
                onClick={() => generate.mutate()}
                disabled={!selectedCandidate.canGenerate || generate.isPending}
                className="w-full bg-[#2D6A4F] disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2.5 rounded-lg border-0 cursor-pointer"
              >
                Generar lote
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Estado de cada panel</h2>
            <p className="text-sm text-gray-500">Aquí ves qué bloquea el lote antes de enviarlo a gerencia.</p>
          </div>

          {loadingCandidates ? (
            <p className="text-center py-12 text-gray-400">Cargando...</p>
          ) : candidates.length === 0 ? (
            <p className="text-center py-12 text-gray-400">Aún no hay paneles para evaluar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Orden", "Cuadrilla", "Aprobado", "Monto", "Estado", "Bloqueos"].map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((item, index) => (
                    <tr key={item.id} className={`border-t border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.orden?.numeroOrden ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{item.cuadrilla?.nombre ?? "-"}</td>
                      <td className="px-4 py-3 text-[#2D6A4F] font-semibold">{item.totalAprobado}</td>
                      <td className="px-4 py-3 text-gray-700">Q {item.montoTotal.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge label={item.canGenerate ? "LISTO" : "BLOQUEADO"} color={item.canGenerate ? "green" : "red"} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.blockers[0] ?? "Sin bloqueos"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Lotes generados</h2>
          <p className="text-sm text-gray-500">Historial temporal de lotes creados desde revisiones aprobadas.</p>
        </div>

        {loadingLots ? (
          <p className="text-center py-12 text-gray-400">Cargando...</p>
        ) : lots.length === 0 ? (
          <p className="text-center py-12 text-gray-400">Aún no hay lotes generados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {["Lote", "Orden", "Cuadrilla", "Piezas", "Monto", "Estado", "Fecha"].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lots.map((item, index) => (
                  <tr key={item.id} className={`border-t border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.numeroLote}</td>
                    <td className="px-4 py-3 text-gray-700">{item.orden?.numeroOrden ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{item.cuadrilla?.nombre ?? "-"}</td>
                    <td className="px-4 py-3 text-[#2D6A4F] font-semibold">{item.totalPiezasAprobadas}</td>
                    <td className="px-4 py-3 text-gray-700">Q {Number(item.montoTotal ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge label={item.estado} color={item.estado === "EN_PROCESO" ? "blue" : "gray"} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.fechaEnvio?.slice(0, 10) ?? "-"}</td>
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

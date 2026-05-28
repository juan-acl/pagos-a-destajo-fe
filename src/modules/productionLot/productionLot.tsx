import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Toast from "@/components/ui/Toast";
import Pagination from "@/components/ui/Pagination";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";
import { useTour } from "@/hooks/useTour";
import { useAuthStore } from "@/store/authStore";
import { PRODUCTION_LOT_TOUR_STEPS } from "./tour";

type LotCandidate = {
  id: number;
  modalidad?: string;
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
    modalidad?: string;
  } | null;
  cuadrilla?: {
    id: number;
    nombre: string;
  } | null;
  pendingAssignments: { id: number; empleadoNombre?: string }[];
  pendingReports?: { id: number; assignment?: { empleadoNombre?: string } | null }[];
  observedReviews: { id: number; assignment?: { empleadoNombre?: string } | null }[];
  approvedReviews: { id: number; assignment?: { empleadoNombre?: string } | null }[];
};

type ProductionLot = {
  id: number;
  numeroLote: string;
  totalPiezasAprobadas: number;
  fechaEnvio: string;
  estado: string;
  montoTotal: number;
  modalidad?: string | null;
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
  api
    .get<ApiEnvelope<ProductionLot[]>>("/production-lot")
    .then((response) => response.data.data);

const normalize = (value?: string | null) => String(value ?? "").trim().toUpperCase();

const modalityLabel = (value?: string | null) =>
  normalize(value) === "PAGO_POR_DIAS" ? "Pago por día" : "Destajo";

const modalityColor = (value?: string | null) =>
  normalize(value) === "PAGO_POR_DIAS" ? "amber" : "green";

const DISPLAY_LIMIT = 10;

const paginate = <T,>(items: T[], page: number) => {
  const totalPages = Math.max(1, Math.ceil(items.length / DISPLAY_LIMIT));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * DISPLAY_LIMIT;
  return items.slice(start, start + DISPLAY_LIMIT);
};

export default function ProductionLotPage() {
  const qc = useQueryClient();
  const { empleado } = useAuthStore();
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [lotsPage, setLotsPage] = useState(1);

  const { startTour } = useTour(
    PRODUCTION_LOT_TOUR_STEPS,
    "production-lot",
    empleado?.id,
  );

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: ["production-lot-candidates"],
    queryFn: fetchCandidates,
  });

  const { data: lots = [], isLoading: loadingLots } = useQuery({
    queryKey: ["production-lot"],
    queryFn: fetchLots,
  });

  const selectedCandidate = useMemo(
    () => candidates.find((item) => item.id === Number(selectedCandidateId)) ?? null,
    [candidates, selectedCandidateId],
  );

  const visibleCandidates = useMemo(
    () => paginate(candidates, candidatesPage),
    [candidates, candidatesPage],
  );

  const visibleLots = useMemo(
    () => paginate(lots, lotsPage),
    [lots, lotsPage],
  );

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["production-lot-candidates"] }),
      qc.invalidateQueries({ queryKey: ["production-lot"] }),
      qc.invalidateQueries({ queryKey: ["production-review-pending"] }),
      qc.invalidateQueries({ queryKey: ["production-review"] }),
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-7">
        <div id="production-lot-title">
          <h1 className="text-2xl font-bold text-gray-900 m-0">Generación de Lote</h1>
          <p className="text-sm text-gray-500 mt-1">
            Aplica únicamente para órdenes con modalidad <strong>DESTAJO</strong>. Las órdenes de pago por día se liquidan desde Gestión de Días y Planilla.
          </p>
        </div>
        <button
          id="production-lot-ayuda-btn"
          type="button"
          onClick={startTour}
          className="bg-white text-[#2D6A4F] border border-[#2D6A4F] text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer hover:bg-[#f0fdf4]"
        >
          ¿Necesitas ayuda?
        </button>
      </div>

      <Toast message={message} type="error" onClose={() => setMessage(null)} />

      <div id="production-lot-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      <div className="grid lg:grid-cols-[380px,1fr] gap-6 mb-6">
        <div id="production-lot-selector" className="bg-white rounded-xl border border-gray-200 p-5">
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
                {item.orden?.numeroOrden ?? `Orden #${item.orden?.id ?? "-"}`} · {item.cuadrilla?.nombre ?? "Sin cuadrilla"} · {modalityLabel(item.modalidad)}
              </option>
            ))}
          </select>

          {selectedCandidate && (
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 space-y-1">
                <p>Orden: <strong>{selectedCandidate.orden?.numeroOrden ?? "-"}</strong></p>
                <p>Cuadrilla: <strong>{selectedCandidate.cuadrilla?.nombre ?? "-"}</strong></p>
                <p>Modalidad: <strong>{modalityLabel(selectedCandidate.modalidad)}</strong></p>
                <p>Cantidad asignada: <strong>{selectedCandidate.cantidadAsignada}</strong></p>
                <p>Total aprobado: <strong className="text-[#2D6A4F]">{selectedCandidate.totalAprobado}</strong></p>
                <p>Monto temporal: <strong>Q {Number(selectedCandidate.montoTotal ?? 0).toFixed(2)}</strong></p>
              </div>

              <div className="rounded-lg border border-gray-100 p-4">
                <p className="font-semibold text-gray-900 mb-2">Precondiciones</p>
                {selectedCandidate.blockers.length === 0 ? (
                  <p className="text-[#2D6A4F]">Todo listo para generar el lote.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1 text-red-600">
                    {selectedCandidate.blockers.slice(0, DISPLAY_LIMIT).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
              </div>

              {(selectedCandidate.pendingReports?.length ?? selectedCandidate.pendingAssignments.length) > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-800 mb-2">Reportes pendientes de revisión</p>
                  <ul className="list-disc pl-5 space-y-1 text-amber-700">
                    {(selectedCandidate.pendingReports ?? selectedCandidate.pendingAssignments).slice(0, DISPLAY_LIMIT).map((item: any) => (
                      <li key={item.id}>#{item.id} · {item.assignment?.empleadoNombre ?? item.empleadoNombre ?? "Empleado"}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedCandidate.observedReviews.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="font-semibold text-gray-800 mb-2">Revisiones observadas</p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    {selectedCandidate.observedReviews.slice(0, DISPLAY_LIMIT).map((item) => (
                      <li key={item.id}>Revisión #{item.id}{item.assignment?.empleadoNombre ? ` · ${item.assignment.empleadoNombre}` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={() => generate.mutate()}
                disabled={!selectedCandidate.canGenerate || generate.isPending}
                className="w-full bg-[#2D6A4F] disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2.5 rounded-lg border-0 cursor-pointer"
              >
                {generate.isPending ? "Generando..." : "Generar lote"}
              </button>
            </div>
          )}
        </div>

        <div id="production-lot-candidates-table" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Estado de cada panel</h2>
            <p className="text-sm text-gray-500">Solo los paneles DESTAJO con producción aprobada y sin reportes pendientes pueden generar lote.</p>
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
                    {["Orden", "Cuadrilla", "Modalidad", "Aprobado", "Monto", "Estado", "Bloqueos"].map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleCandidates.map((item, index) => (
                    <tr key={item.id} className={`border-t border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.orden?.numeroOrden ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{item.cuadrilla?.nombre ?? "-"}</td>
                      <td className="px-4 py-3"><Badge label={modalityLabel(item.modalidad)} color={modalityColor(item.modalidad) as any} /></td>
                      <td className="px-4 py-3 text-[#2D6A4F] font-semibold">{item.totalAprobado}</td>
                      <td className="px-4 py-3 text-gray-700">Q {Number(item.montoTotal ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3"><Badge label={item.canGenerate ? "LISTO" : "BLOQUEADO"} color={item.canGenerate ? "green" : "red"} /></td>
                      <td className="px-4 py-3 text-gray-600">{item.blockers[0] ?? "Sin bloqueos"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                page={candidatesPage}
                total={candidates.length}
                pageSize={DISPLAY_LIMIT}
                itemLabel="panel(es)"
                onPageChange={setCandidatesPage}
              />
            </div>
          )}
        </div>
      </div>

      <div id="production-lot-lots-table" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Lotes generados</h2>
          <p className="text-sm text-gray-500">Historial de lotes creados desde revisiones aprobadas.</p>
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
                  {["Lote", "Orden", "Cuadrilla", "Modalidad", "Piezas", "Monto", "Estado", "Fecha"].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleLots.map((item, index) => (
                  <tr key={item.id} className={`border-t border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.numeroLote}</td>
                    <td className="px-4 py-3 text-gray-700">{item.orden?.numeroOrden ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{item.cuadrilla?.nombre ?? "-"}</td>
                    <td className="px-4 py-3"><Badge label={modalityLabel(item.modalidad)} color={modalityColor(item.modalidad) as any} /></td>
                    <td className="px-4 py-3 text-[#2D6A4F] font-semibold">{item.totalPiezasAprobadas}</td>
                    <td className="px-4 py-3 text-gray-700">Q {Number(item.montoTotal ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3"><Badge label={item.estado} color={normalize(item.estado) === "ACTIVO" || normalize(item.estado) === "ACTIVA" ? "blue" : normalize(item.estado) === "APROBADO" || normalize(item.estado) === "APROBADA" ? "green" : "gray"} /></td>
                    <td className="px-4 py-3 text-gray-600">{item.fechaEnvio?.slice(0, 10) ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={lotsPage}
              total={lots.length}
              pageSize={DISPLAY_LIMIT}
              itemLabel="lote(s)"
              onPageChange={setLotsPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

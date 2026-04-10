import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";

type ProductionReviewRef = {
  id: number;
  estadoRevision?: string;
  cantidadAprobada?: number;
};

type ProductionLot = {
  id: number;
  numeroLote: string;
  totalPiezasAprobadas: number;
  fechaEnvio: string;
  estado: string;
  revisionProduccionId?: number | ProductionReviewRef | null;
};

type ProductionLotForm = {
  numeroLote: string;
  totalPiezasAprobadas: number | "";
  fechaEnvio: string;
  estado: string;
  revisionProduccionId: number | "";
};

const empty: ProductionLotForm = {
  numeroLote: "",
  totalPiezasAprobadas: "",
  fechaEnvio: "",
  estado: "ACTIVO",
  revisionProduccionId: "",
};

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
  const [form, setForm] = useState<ProductionLotForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const { data: data = [], isLoading } = useQuery({
    queryKey: ["production-lot"],
    queryFn: fetchLots,
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["production-review"],
    queryFn: fetchReviews,
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

  const filtered = useMemo(
    () =>
      data.filter((item) => {
        const texto = `${item.id} ${item.numeroLote} ${item.totalPiezasAprobadas} ${getReviewLabel(item.revisionProduccionId)} ${item.fechaEnvio}`.toLowerCase();
        const matchSearch = !search || texto.includes(search.toLowerCase());
        const matchEstado = !filterEstado || item.estado === filterEstado;
        return matchSearch && matchEstado;
      }),
    [data, search, filterEstado, reviews],
  );

  const activos = data.filter((item) => item.estado === "ACTIVO").length;
  const inactivos = data.filter((item) => item.estado === "INACTIVO").length;
  const vinculados = data.filter((item) => getReviewId(item.revisionProduccionId) != null).length;

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setOpen(false);
    setMessage(null);
  };

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["production-lot"] });
    reset();
  };

  const create = useMutation({
    mutationFn: (payload: ProductionLotForm) =>
      api.post("/production-lot", {
        numeroLote: payload.numeroLote,
        totalPiezasAprobadas: Number(payload.totalPiezasAprobadas),
        fechaEnvio: payload.fechaEnvio,
        estado: payload.estado,
        revisionProduccionId:
          payload.revisionProduccionId === ""
            ? undefined
            : Number(payload.revisionProduccionId),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: (payload: ProductionLotForm) =>
      api.put(`/production-lot/${editId}`, {
        numeroLote: payload.numeroLote,
        totalPiezasAprobadas: Number(payload.totalPiezasAprobadas),
        fechaEnvio: payload.fechaEnvio,
        estado: payload.estado,
        revisionProduccionId:
          payload.revisionProduccionId === ""
            ? undefined
            : Number(payload.revisionProduccionId),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/production-lot/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["production-lot"] });
      setMessage(null);
    },
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const edit = (item: ProductionLot) => {
    setForm({
      numeroLote: item.numeroLote,
      totalPiezasAprobadas: item.totalPiezasAprobadas,
      fechaEnvio: item.fechaEnvio?.slice(0, 10) ?? "",
      estado: item.estado,
      revisionProduccionId: getReviewId(item.revisionProduccionId) ?? "",
    });
    setEditId(item.id);
    setOpen(true);
    setMessage(null);
  };

  const change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "totalPiezasAprobadas" || name === "revisionProduccionId"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (editId) {
      update.mutate(form);
      return;
    }
    create.mutate(form);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">
            Lote de Producción
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestione lotes enviados, cantidades aprobadas y su vínculo con revisiones.
          </p>
        </div>
        <button
          onClick={() => {
            reset();
            setOpen(true);
          }}
          className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0"
        >
          + Nuevo Lote
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Lotes", value: data.length, color: "text-gray-900" },
          { label: "Activos", value: activos, color: "text-[#2D6A4F]" },
          { label: "Inactivos", value: inactivos, color: "text-red-600" },
          { label: "Vinculados", value: vinculados, color: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {stat.label}
            </p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col lg:flex-row gap-3">
        <input
          placeholder="Buscar por lote, revisión o fecha..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 min-w-0"
        />
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 bg-white"
        >
          <option value="">Estado: Todos</option>
          <option value="ACTIVO">ACTIVO</option>
          <option value="INACTIVO">INACTIVO</option>
        </select>
      </div>

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
                  {[
                    "Lote",
                    "Piezas Aprobadas",
                    "Fecha Envío",
                    "Estado",
                    "Revisión",
                    "Acciones",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-t border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {(item.numeroLote || "L").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {item.numeroLote}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">
                            Lote #{item.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {item.totalPiezasAprobadas}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.fechaEnvio?.slice(0, 10) ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={item.estado}
                        color={item.estado === "ACTIVO" ? "green" : "gray"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {getReviewId(item.revisionProduccionId) ? (
                        <Badge
                          label={getReviewLabel(item.revisionProduccionId)}
                          color="blue"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">
                          Sin revisión
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => edit(item)}
                          className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => remove.mutate(item.id)}
                          className="bg-red-50 hover:bg-red-100 border-0 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
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
            Mostrando {filtered.length} de {data.length} lotes
          </p>
        )}
      </div>

      <Modal
        open={open}
        title={editId ? "Editar Lote" : "Nuevo Lote"}
        subtitle="Complete la información para registrar el lote de producción."
        onClose={reset}
      >
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Número de Lote *
              <input
                name="numeroLote"
                value={form.numeroLote}
                onChange={change}
                required
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total Piezas Aprobadas *
              <input
                name="totalPiezasAprobadas"
                type="number"
                value={form.totalPiezasAprobadas}
                onChange={change}
                required
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Fecha Envío *
              <input
                name="fechaEnvio"
                type="date"
                value={form.fechaEnvio}
                onChange={change}
                required
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Revisión de Producción
              <select
                name="revisionProduccionId"
                value={form.revisionProduccionId}
                onChange={change}
                disabled={loadingReviews}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white font-normal normal-case tracking-normal"
              >
                <option value="">
                  {loadingReviews ? "Cargando revisiones..." : "Selecciona una revisión"}
                </option>
                {reviewsDisponibles.map((review) => (
                  <option key={review.id} value={review.id}>
                    {getReviewLabel(review)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide sm:col-span-2">
              Estado
              <div className="flex gap-4 mt-1">
                {["ACTIVO", "INACTIVO"].map((estado) => (
                  <label
                    key={estado}
                    className="flex items-center gap-2 cursor-pointer text-sm font-normal normal-case tracking-normal text-gray-700"
                  >
                    <input
                      type="radio"
                      name="estado"
                      value={estado}
                      checked={form.estado === estado}
                      onChange={change}
                    />
                    {estado.charAt(0) + estado.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
            <button
              type="button"
              onClick={reset}
              className="bg-white text-gray-900 border border-gray-200 rounded-lg px-5 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending || update.isPending}
              className="bg-[#2D6A4F] text-white rounded-lg px-5 py-2.5 text-sm font-semibold border-0 cursor-pointer hover:bg-[#245a42] transition-colors disabled:opacity-50"
            >
              {editId ? "Actualizar" : "Guardar Lote"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";

type CuadrillaRef = {
  id: number;
  nombre?: string;
  codigoCuadrilla?: string | null;
};

type EmployeeAssignment = {
  id: number;
  metaIndividual: number;
  estado: string;
  cuadrillaId: number | CuadrillaRef;
};

type ProductionReview = {
  id: number;
  cantidadRecibida: number;
  cantidadAprobada: number;
  estadoRevision: string;
  observaciones?: string | null;
  fechaRevision: string;
  asignacionEmpleadoId: number | EmployeeAssignment;
};

type ProductionReviewForm = {
  cantidadRecibida: number | "";
  cantidadAprobada: number | "";
  estadoRevision: string;
  observaciones: string;
  fechaRevision: string;
  asignacionEmpleadoId: number | "";
};

const empty: ProductionReviewForm = {
  cantidadRecibida: "",
  cantidadAprobada: "",
  estadoRevision: "APROBADO",
  observaciones: "",
  fechaRevision: "",
  asignacionEmpleadoId: "",
};

const fetchReviews = () =>
  api
    .get<ApiEnvelope<ProductionReview[]>>("/production-review")
    .then((response) => response.data.data);

const fetchAssignments = () =>
  api
    .get<ApiEnvelope<EmployeeAssignment[]>>("/employee-assignment")
    .then((response) => response.data.data);

export default function ProductionReviewPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductionReviewForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["production-review"],
    queryFn: fetchReviews,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["employee-assignment"],
    queryFn: fetchAssignments,
  });

  const getAssignmentId = (assignment: number | EmployeeAssignment) =>
    typeof assignment === "number" ? assignment : assignment.id;

  const getCuadrillaLabelFromAssignment = (assignment: EmployeeAssignment) => {
    if (typeof assignment.cuadrillaId === "number") {
      return `Cuadrilla ${assignment.cuadrillaId}`;
    }

    if (assignment.cuadrillaId.codigoCuadrilla) {
      return `${assignment.cuadrillaId.nombre ?? "Cuadrilla"} (${assignment.cuadrillaId.codigoCuadrilla})`;
    }

    return assignment.cuadrillaId.nombre ?? `Cuadrilla ${assignment.cuadrillaId.id}`;
  };

  const getAssignmentLabel = (assignmentInput: number | EmployeeAssignment) => {
    const assignmentId = getAssignmentId(assignmentInput);
    const assignment =
      typeof assignmentInput === "number"
        ? assignments.find((item) => item.id === assignmentInput)
        : assignmentInput;

    if (!assignment) return `Asignación #${assignmentId}`;

    return `Asignación #${assignment.id} · Meta ${assignment.metaIndividual} · ${getCuadrillaLabelFromAssignment(assignment)}`;
  };

  const assignmentsDisponibles = useMemo(
    () => assignments.filter((item) => item.estado === "ACTIVO"),
    [assignments],
  );

  const filtered = useMemo(
    () =>
      reviews.filter((item) => {
        const texto = `${item.id} ${item.cantidadRecibida} ${item.cantidadAprobada} ${item.observaciones ?? ""} ${getAssignmentLabel(item.asignacionEmpleadoId)} ${item.fechaRevision}`.toLowerCase();
        const matchSearch = !search || texto.includes(search.toLowerCase());
        const matchEstado =
          !filterEstado || item.estadoRevision === filterEstado;
        return matchSearch && matchEstado;
      }),
    [reviews, search, filterEstado, assignments],
  );

  const aprobadas = reviews.filter(
    (item) => item.estadoRevision === "APROBADO",
  ).length;
  const rechazadas = reviews.filter(
    (item) => item.estadoRevision === "RECHAZADO",
  ).length;
  const pendientes = reviews.filter(
    (item) => item.estadoRevision === "PENDIENTE",
  ).length;

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setOpen(false);
    setMessage(null);
  };

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["production-review"] });
    reset();
  };

  const create = useMutation({
    mutationFn: (payload: ProductionReviewForm) =>
      api.post("/production-review", {
        cantidadRecibida: Number(payload.cantidadRecibida),
        cantidadAprobada: Number(payload.cantidadAprobada),
        estadoRevision: payload.estadoRevision,
        observaciones: payload.observaciones || null,
        fechaRevision: payload.fechaRevision,
        asignacionEmpleadoId: Number(payload.asignacionEmpleadoId),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: (payload: ProductionReviewForm) =>
      api.put(`/production-review/${editId}`, {
        cantidadRecibida: Number(payload.cantidadRecibida),
        cantidadAprobada: Number(payload.cantidadAprobada),
        estadoRevision: payload.estadoRevision,
        observaciones: payload.observaciones || null,
        fechaRevision: payload.fechaRevision,
        asignacionEmpleadoId: Number(payload.asignacionEmpleadoId),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/production-review/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["production-review"] });
      setMessage(null);
    },
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const edit = (item: ProductionReview) => {
    setForm({
      cantidadRecibida: item.cantidadRecibida,
      cantidadAprobada: item.cantidadAprobada,
      estadoRevision: item.estadoRevision,
      observaciones: item.observaciones ?? "",
      fechaRevision: item.fechaRevision?.slice(0, 10) ?? "",
      asignacionEmpleadoId: getAssignmentId(item.asignacionEmpleadoId),
    });
    setEditId(item.id);
    setOpen(true);
    setMessage(null);
  };

  const change = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "cantidadRecibida" ||
        name === "cantidadAprobada" ||
        name === "asignacionEmpleadoId"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (form.asignacionEmpleadoId === "") {
      setMessage("Debes seleccionar una asignación de empleado.");
      return;
    }

    if (editId) {
      update.mutate(form);
      return;
    }

    create.mutate(form);
  };

  const getRevisionBadgeColor = (estado: string) => {
    if (estado === "APROBADO") return "green" as const;
    if (estado === "RECHAZADO") return "red" as const;
    if (estado === "PENDIENTE") return "amber" as const;
    return "gray" as const;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">
            Revisión de Producción
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Controle cantidades revisadas, resultados y observaciones de producción.
          </p>
        </div>

        <button
          onClick={() => {
            reset();
            setOpen(true);
          }}
          className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0"
        >
          + Nueva Revisión
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Revisiones", value: reviews.length, color: "text-gray-900" },
          { label: "Aprobadas", value: aprobadas, color: "text-[#2D6A4F]" },
          { label: "Pendientes", value: pendientes, color: "text-amber-600" },
          { label: "Rechazadas", value: rechazadas, color: "text-red-600" },
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
          placeholder="Buscar por revisión, asignación u observaciones..."
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
          <option value="APROBADO">APROBADO</option>
          <option value="PENDIENTE">PENDIENTE</option>
          <option value="RECHAZADO">RECHAZADO</option>
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
                    "Revisión",
                    "Cant. Recibida",
                    "Cant. Aprobada",
                    "Asignación",
                    "Estado",
                    "Fecha",
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
                          R{item.id}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Revisión #{item.id}
                          </p>
                          <p className="text-xs text-gray-400">
                            {item.observaciones?.trim() || "Sin observaciones"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {item.cantidadRecibida}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {item.cantidadAprobada}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={getAssignmentLabel(item.asignacionEmpleadoId)}
                        color="blue"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={item.estadoRevision}
                        color={getRevisionBadgeColor(item.estadoRevision)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.fechaRevision?.slice(0, 10) || "-"}
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
            Mostrando {filtered.length} de {reviews.length} revisiones
          </p>
        )}
      </div>

      <Modal
        open={open}
        title={editId ? "Editar Revisión" : "Nueva Revisión"}
        subtitle="Complete la información para registrar la revisión de producción."
        onClose={reset}
        width={720}
      >
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cantidad Recibida *
              <input
                name="cantidadRecibida"
                type="number"
                value={form.cantidadRecibida}
                onChange={change}
                required
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cantidad Aprobada *
              <input
                name="cantidadAprobada"
                type="number"
                value={form.cantidadAprobada}
                onChange={change}
                required
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide sm:col-span-2">
              Asignación de Empleado *
              <select
                name="asignacionEmpleadoId"
                value={form.asignacionEmpleadoId}
                onChange={change}
                required
                disabled={loadingAssignments}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white font-normal normal-case tracking-normal"
              >
                <option value="">
                  {loadingAssignments
                    ? "Cargando asignaciones..."
                    : "Selecciona una asignación"}
                </option>
                {assignmentsDisponibles.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {getAssignmentLabel(assignment)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Estado Revisión
              <select
                name="estadoRevision"
                value={form.estadoRevision}
                onChange={change}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white font-normal normal-case tracking-normal"
              >
                <option value="APROBADO">APROBADO</option>
                <option value="RECHAZADO">RECHAZADO</option>
                <option value="PENDIENTE">PENDIENTE</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Fecha Revisión *
              <input
                name="fechaRevision"
                type="date"
                value={form.fechaRevision}
                onChange={change}
                required
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide sm:col-span-2">
              Observaciones
              <textarea
                name="observaciones"
                value={form.observaciones}
                onChange={change}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal min-h-[110px] resize-y"
              />
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
              {editId ? "Actualizar" : "Guardar Revisión"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";

type EmployeeAssignment = {
  id: number;
  metaIndividual: number;
  estado: string;
  cuadrillaId: number | Cuadrilla | null;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
};

type Cuadrilla = {
  id: number;
  nombre: string;
  codigoCuadrilla?: string | null;
  areaId?: number | null;
  estado: string;
};

type EmployeeAssignmentForm = {
  metaIndividual: number | "";
  estado: string;
  cuadrillaId: number | "";
};

const empty: EmployeeAssignmentForm = {
  metaIndividual: "",
  estado: "ACTIVO",
  cuadrillaId: "",
};

const fetchAssignments = () =>
  api
    .get<ApiEnvelope<EmployeeAssignment[]>>("/employee-assignment")
    .then((response) => response.data.data);

const fetchCuadrillas = () =>
  api
    .get<ApiEnvelope<Cuadrilla[]>>("/cuadrillas")
    .then((response) => response.data.data);

export default function EmployeeAssignmentPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<EmployeeAssignmentForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCuadrilla, setFilterCuadrilla] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["employee-assignment"],
    queryFn: fetchAssignments,
  });

  const { data: cuadrillas = [], isLoading: loadingCuadrillas } = useQuery({
    queryKey: ["cuadrillas"],
    queryFn: fetchCuadrillas,
  });

  const cuadrillasDisponibles = useMemo(
    () => cuadrillas.filter((item) => item.estado === "ACTIVO"),
    [cuadrillas],
  );

  const getCuadrillaId = (cuadrilla: number | Cuadrilla | null | undefined) => {
    if (cuadrilla == null) return null;
    return typeof cuadrilla === "number" ? cuadrilla : cuadrilla.id;
  };

  const getCuadrilla = (cuadrilla: number | Cuadrilla | null | undefined) => {
    if (cuadrilla == null) return null;
    if (typeof cuadrilla !== "number") return cuadrilla;
    return cuadrillas.find((item) => item.id === cuadrilla) ?? null;
  };

  const getCuadrillaLabel = (cuadrilla: number | Cuadrilla | null | undefined) => {
    const cuadrillaData = getCuadrilla(cuadrilla);
    const cuadrillaId = getCuadrillaId(cuadrilla);

    if (!cuadrillaData) return cuadrillaId ? `ID ${cuadrillaId}` : "Sin cuadrilla";

    return cuadrillaData.codigoCuadrilla
      ? `${cuadrillaData.nombre} (${cuadrillaData.codigoCuadrilla})`
      : cuadrillaData.nombre;
  };

  const filtered = useMemo(
    () =>
      assignments.filter((item) => {
        const texto = `${item.id} ${item.metaIndividual} ${getCuadrillaLabel(item.cuadrillaId)}`.toLowerCase();
        const matchSearch = !search || texto.includes(search.toLowerCase());
        const matchCuadrilla =
          !filterCuadrilla || String(getCuadrillaId(item.cuadrillaId) ?? "") === filterCuadrilla;
        const matchEstado = !filterEstado || item.estado === filterEstado;
        return matchSearch && matchCuadrilla && matchEstado;
      }),
    [assignments, search, filterCuadrilla, filterEstado, cuadrillas],
  );

  const activas = assignments.filter((item) => item.estado === "ACTIVO").length;
  const inactivas = assignments.filter((item) => item.estado === "INACTIVO").length;

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setOpen(false);
    setMessage(null);
  };

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["employee-assignment"] });
    reset();
  };

  const create = useMutation({
    mutationFn: (payload: EmployeeAssignmentForm) =>
      api.post("/employee-assignment", {
        metaIndividual: Number(payload.metaIndividual),
        estado: payload.estado,
        cuadrillaId: Number(payload.cuadrillaId),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: (payload: EmployeeAssignmentForm) =>
      api.put(`/employee-assignment/${editId}`, {
        metaIndividual: Number(payload.metaIndividual),
        estado: payload.estado,
        cuadrillaId: Number(payload.cuadrillaId),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/employee-assignment/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["employee-assignment"] });
      setMessage(null);
    },
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const edit = (item: EmployeeAssignment) => {
    setForm({
      metaIndividual: item.metaIndividual,
      estado: item.estado,
      cuadrillaId: getCuadrillaId(item.cuadrillaId) ?? "",
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
        name === "metaIndividual" || name === "cuadrillaId"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (form.cuadrillaId === "") {
      setMessage("Debes seleccionar una cuadrilla.");
      return;
    }

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
            Asignación de Empleado
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure metas individuales por cuadrilla y controle su estado.
          </p>
        </div>
        <button
          onClick={() => {
            reset();
            setOpen(true);
          }}
          className="bg-[#2D6A4F] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#245a42] transition-colors whitespace-nowrap cursor-pointer border-0"
        >
          + Nueva Asignación
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Asignaciones",
            value: assignments.length,
            color: "text-gray-900",
          },
          { label: "Activas", value: activas, color: "text-[#2D6A4F]" },
          { label: "Inactivas", value: inactivas, color: "text-red-600" },
          {
            label: "Cuadrillas",
            value: cuadrillasDisponibles.length,
            color: "text-gray-900",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {stat.label}
            </p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col lg:flex-row gap-3">
        <input
          placeholder="Buscar por asignación, meta o cuadrilla..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 min-w-0"
        />
        <select
          value={filterCuadrilla}
          onChange={(e) => setFilterCuadrilla(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 bg-white"
        >
          <option value="">Cuadrilla: Todas</option>
          {cuadrillas.map((cuadrilla) => (
            <option key={cuadrilla.id} value={cuadrilla.id}>
              {getCuadrillaLabel(cuadrilla.id)}
            </option>
          ))}
        </select>
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
                    "Asignación",
                    "Meta Individual",
                    "Cuadrilla",
                    "Estado",
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
                {filtered.map((item, index) => {
                  const cuadrilla = getCuadrilla(item.cuadrillaId);
                  const cuadrillaId = getCuadrillaId(item.cuadrillaId);
                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            A{item.id}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              Asignación #{item.id}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">
                              {cuadrilla?.codigoCuadrilla ?? "Sin código"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">
                          {item.metaIndividual}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {cuadrilla ? (
                          <Badge label={getCuadrillaLabel(item.cuadrillaId)} color="amber" />
                        ) : (
                          <span className="text-xs text-gray-400">
                            ID: {cuadrillaId ?? "-"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={item.estado}
                          color={item.estado === "ACTIVO" ? "green" : "gray"}
                        />
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Mostrando {filtered.length} de {assignments.length} asignaciones
          </p>
        )}
      </div>

      <Modal
        open={open}
        title={editId ? "Editar Asignación" : "Nueva Asignación"}
        subtitle="Complete la información para registrar la asignación del empleado."
        onClose={reset}
      >
        <form onSubmit={submit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Meta Individual *
              <input
                name="metaIndividual"
                type="number"
                placeholder="Ej. 120"
                value={form.metaIndividual}
                onChange={change}
                required
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none font-normal normal-case tracking-normal"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cuadrilla *
              <select
                name="cuadrillaId"
                value={form.cuadrillaId}
                onChange={change}
                required
                disabled={loadingCuadrillas}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none bg-white font-normal normal-case tracking-normal"
              >
                <option value="">
                  {loadingCuadrillas
                    ? "Cargando cuadrillas..."
                    : "Selecciona una cuadrilla"}
                </option>
                {cuadrillasDisponibles.map((cuadrilla) => (
                  <option key={cuadrilla.id} value={cuadrilla.id}>
                    {getCuadrillaLabel(cuadrilla.id)}
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
              {editId ? "Actualizar" : "Guardar Asignación"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

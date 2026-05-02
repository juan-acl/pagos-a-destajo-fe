import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";

type AssignmentItem = {
  id: number;
  metaIndividual: number;
  estado: string;
  empleadoId: number | null;
  empleadoNombre: string;
  asignacionOrdenCuadrillaId: number | null;
  ordenTrabajoId: number | null;
  cantidadAsignadaCuadrilla: number | null;
  cantidadAprobadaAcumulada: number;
  cantidadPendiente: number;
  puedeEditar: boolean;
  cuadrilla?: {
    id: number;
    nombre?: string;
    codigoCuadrilla?: string | null;
  } | null;
};

type PanelMember = {
  empleadoId: number;
  empleadoNombre: string;
  puestoNombre?: string | null;
};

type PanelAuto = {
  empleadoId: number;
  metaIndividual: number;
};

type AssignmentPanel = {
  id: number;
  estado: string;
  cantidadAsignada: number;
  orden?: {
    id: number;
    numeroOrden: string;
    estado: string;
  } | null;
  cuadrilla?: {
    id: number;
    nombre: string;
    codigoCuadrilla?: string | null;
  } | null;
  miembros?: PanelMember[];
  assignedTotal: number;
  remaining: number;
  allowEdit: boolean;
  autoDistribution?: PanelAuto[];
  existingAssignments?: AssignmentItem[];
};

type ManualMeta = Record<number, number | "">;

type ManualMetaByPanel = Record<number, ManualMeta>;

const buildInitialMetas = (panel: AssignmentPanel | null): ManualMeta => {
  if (!panel) return {};

  const existingAssignments = panel.existingAssignments ?? [];
  const autoDistribution = panel.autoDistribution ?? [];

  if (existingAssignments.length > 0) {
    return existingAssignments.reduce<ManualMeta>((acc, item) => {
      if (item.empleadoId != null) {
        acc[item.empleadoId] = item.metaIndividual;
      }
      return acc;
    }, {});
  }

  return autoDistribution.reduce<ManualMeta>((acc, item) => {
    acc[item.empleadoId] = item.metaIndividual;
    return acc;
  }, {});
};

const fetchPanels = () =>
  api
    .get<ApiEnvelope<AssignmentPanel[]>>("/employee-assignment/panels")
    .then((response) => response.data.data);

const fetchAssignments = () =>
  api
    .get<ApiEnvelope<AssignmentItem[]>>("/employee-assignment")
    .then((response) => response.data.data);

export default function EmployeeAssignmentPage() {
  const qc = useQueryClient();
  const [selectedPanelId, setSelectedPanelId] = useState<number | "">("");
  const [metasByPanel, setMetasByPanel] = useState<ManualMetaByPanel>({});
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: panels = [], isLoading: loadingPanels } = useQuery({
    queryKey: ["employee-assignment-panels"],
    queryFn: fetchPanels,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["employee-assignment"],
    queryFn: fetchAssignments,
  });

  const selectedPanel = useMemo(
    () => panels.find((item) => item.id === Number(selectedPanelId)) ?? null,
    [panels, selectedPanelId],
  );

  const metas = useMemo<ManualMeta>(() => {
    if (!selectedPanel) return {};
    return metasByPanel[selectedPanel.id] ?? buildInitialMetas(selectedPanel);
  }, [metasByPanel, selectedPanel]);

  const totalManual = useMemo(
    () => Object.values(metas).reduce<number>((acc, value) => acc + Number(value || 0), 0),
    [metas],
  );

  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assignments;
    return assignments.filter((item) => {
      const text =
        `${item.id} ${item.empleadoNombre} ${item.cuadrilla?.nombre ?? ""} ${item.ordenTrabajoId ?? ""}`.toLowerCase();
      return text.includes(term);
    });
  }, [assignments, search]);

  const resetMessage = () => setMessage(null);

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["employee-assignment-panels"] }),
      qc.invalidateQueries({ queryKey: ["employee-assignment"] }),
      qc.invalidateQueries({ queryKey: ["production-review-pending"] }),
      qc.invalidateQueries({ queryKey: ["production-lot-candidates"] }),
    ]);
  };

  const distributeAutomatic = useMutation({
    mutationFn: async (panelId: number) =>
      api.post("/employee-assignment/distribute", {
        asignacionOrdenCuadrillaId: panelId,
        modo: "AUTOMATICA",
        metas: [],
      }),
    onSuccess: async () => {
      resetMessage();
      await invalidate();
    },
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const distributeManual = useMutation({
    mutationFn: async (panelId: number) =>
      api.post("/employee-assignment/distribute", {
        asignacionOrdenCuadrillaId: panelId,
        modo: "MANUAL",
        metas:
          (selectedPanel?.miembros ?? []).map((member) => ({
            empleadoId: member.empleadoId,
            metaIndividual: Number(metas[member.empleadoId] || 0),
          })) ?? [],
      }),
    onSuccess: async () => {
      resetMessage();
      await invalidate();
    },
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const applyAutoPreview = () => {
    if (!selectedPanel) return;
    const next = (selectedPanel.autoDistribution ?? []).reduce<ManualMeta>((acc, item) => {
      acc[item.empleadoId] = item.metaIndividual;
      return acc;
    }, {});
    setMetasByPanel((prev) => ({
      ...prev,
      [selectedPanel.id]: next,
    }));
  };

  const saveManual = () => {
    if (!selectedPanel) return;
    if (totalManual > selectedPanel.cantidadAsignada) {
      setMessage(
        `La suma de metas (${totalManual}) supera la cantidad asignada (${selectedPanel.cantidadAsignada}).`,
      );
      return;
    }
    distributeManual.mutate(selectedPanel.id);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">
            Asignación de Meta Individual
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Distribuya metas por orden y cuadrilla sin tocar manualmente la base.
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Paneles activos", value: panels.length, color: "text-gray-900" },
          {
            label: "Metas activas",
            value: assignments.filter((item) => item.estado === "ACTIVA").length,
            color: "text-[#2D6A4F]",
          },
          {
            label: "Metas inactivas",
            value: assignments.filter((item) => item.estado === "INACTIVA").length,
            color: "text-red-600",
          },
          {
            label: "Asignaciones registradas",
            value: assignments.length,
            color: "text-blue-600",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {stat.label}
            </p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[340px,1fr] gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Orden y cuadrilla
          </label>
          <select
            value={selectedPanelId}
            onChange={(e) => {
              const nextPanelId = e.target.value === "" ? "" : Number(e.target.value);
              setSelectedPanelId(nextPanelId);
              setMessage(null);

              if (nextPanelId === "") return;

              const nextPanel = panels.find((panel) => panel.id === nextPanelId) ?? null;
              if (!nextPanel) return;

              setMetasByPanel((prev) => ({
                ...prev,
                [nextPanelId]: prev[nextPanelId] ?? buildInitialMetas(nextPanel),
              }));
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
          >
            <option value="">Selecciona una asignación de orden a cuadrilla</option>
            {panels.map((panel) => (
              <option key={panel.id} value={panel.id}>
                {panel.orden?.numeroOrden ?? `Orden #${panel.orden?.id ?? "-"}`} ·{" "}
                {panel.cuadrilla?.nombre ?? `Cuadrilla #${panel.cuadrilla?.id ?? "-"}`}
              </option>
            ))}
          </select>

          {selectedPanel && (
            <div className="mt-5 space-y-3 text-sm text-gray-700">
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                <p className="font-semibold text-gray-900 mb-1">Resumen del panel</p>
                <p>
                  Orden: <strong>{selectedPanel.orden?.numeroOrden ?? "-"}</strong>
                </p>
                <p>
                  Cuadrilla: <strong>{selectedPanel.cuadrilla?.nombre ?? "-"}</strong>
                </p>
                <p>
                  Cantidad asignada: <strong>{selectedPanel.cantidadAsignada}</strong>
                </p>
                <p>
                  Estado de orden: <strong>{selectedPanel.orden?.estado ?? "-"}</strong>
                </p>
                <p>
                  Miembros activos: <strong>{selectedPanel.miembros?.length ?? 0}</strong>
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-4">
                <p className="font-semibold text-gray-900 mb-1">Control de suma</p>
                <p>
                  Suma actual:{" "}
                  <strong
                    className={
                      totalManual > selectedPanel.cantidadAsignada
                        ? "text-red-600"
                        : "text-[#2D6A4F]"
                    }
                  >
                    {totalManual}
                  </strong>
                </p>
                <p>
                  Máximo permitido: <strong>{selectedPanel.cantidadAsignada}</strong>
                </p>
                <p>
                  Disponible restante:{" "}
                  <strong>{selectedPanel.cantidadAsignada - totalManual}</strong>
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={applyAutoPreview}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors border-0 cursor-pointer"
                >
                  Cargar distribución equitativa
                </button>
                <button
                  type="button"
                  onClick={saveManual}
                  disabled={
                    !selectedPanel.allowEdit ||
                    totalManual > selectedPanel.cantidadAsignada ||
                    distributeManual.isPending
                  }
                  className="w-full bg-[#2D6A4F] disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors border-0 cursor-pointer"
                >
                  Guardar metas manuales
                </button>
                <button
                  type="button"
                  onClick={() =>
                    selectedPanel && distributeAutomatic.mutate(selectedPanel.id)
                  }
                  disabled={!selectedPanel.allowEdit || distributeAutomatic.isPending}
                  className="w-full bg-blue-600 disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors border-0 cursor-pointer"
                >
                  Guardar distribución automática
                </button>
              </div>

              {!selectedPanel.allowEdit && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Estas metas ya tienen producción o revisión registrada, por eso están
                  bloqueadas.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Detalle por miembro</h2>
              <p className="text-sm text-gray-500">
                Ingresa manualmente o usa la distribución automática.
              </p>
            </div>
          </div>

          {!selectedPanel ? (
            <p className="text-center py-12 text-gray-400">
              Selecciona un panel para distribuir metas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {[
                      "Empleado",
                      "Puesto",
                      "Meta",
                      "Producción aprobada",
                      "Pendiente",
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
                  {(selectedPanel.miembros ?? []).map((member, index) => {
                    const current = (selectedPanel.existingAssignments ?? []).find(
                      (item) => item.empleadoId === member.empleadoId,
                    );

                    return (
                      <tr
                        key={member.empleadoId}
                        className={`border-t border-gray-100 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {member.empleadoNombre}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {member.puestoNombre ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            value={metas[member.empleadoId] ?? ""}
                            disabled={!selectedPanel.allowEdit}
                            onChange={(e) => {
                              if (!selectedPanel) return;

                              setMetasByPanel((prev) => ({
                                ...prev,
                                [selectedPanel.id]: {
                                  ...(prev[selectedPanel.id] ??
                                    buildInitialMetas(selectedPanel)),
                                  [member.empleadoId]:
                                    e.target.value === ""
                                      ? ""
                                      : Number(e.target.value),
                                },
                              }));
                            }}
                            className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-4 py-3 text-[#2D6A4F] font-semibold">
                          {current?.cantidadAprobadaAcumulada ?? 0}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {current?.cantidadPendiente ??
                            Number(metas[member.empleadoId] || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Metas registradas</h2>
            <p className="text-sm text-gray-500">
              Vista temporal enriquecida por empleado, orden y cuadrilla.
            </p>
          </div>
          <input
            placeholder="Buscar por empleado, orden o cuadrilla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 min-w-[260px]"
          />
        </div>

        {loadingPanels || loadingAssignments ? (
          <p className="text-center py-12 text-gray-400">Cargando...</p>
        ) : filteredAssignments.length === 0 ? (
          <p className="text-center py-12 text-gray-400">Sin metas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {[
                    "Asignación",
                    "Empleado",
                    "Cuadrilla",
                    "Meta",
                    "Aprobada",
                    "Estado",
                    "Editable",
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
                {filteredAssignments.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-t border-gray-100 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">#{item.id}</td>
                    <td className="px-4 py-3 text-gray-700">{item.empleadoNombre}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.cuadrilla?.nombre ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{item.metaIndividual}</td>
                    <td className="px-4 py-3 text-[#2D6A4F] font-semibold">
                      {item.cantidadAprobadaAcumulada}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={item.estado}
                        color={item.estado === "ACTIVA" ? "green" : "gray"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={item.puedeEditar ? "SI" : "NO"}
                        color={item.puedeEditar ? "blue" : "gray"}
                      />
                    </td>
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
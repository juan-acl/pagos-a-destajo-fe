import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import { type ApiEnvelope } from "@/utils/api";
import {
  calculateInclusiveDays,
  getDiasText,
  isActiveStatus,
  modalidadLabel,
  money,
  normalizeDateInput,
  normalizeModalidadPago,
  normalizeTipoPagoDias,
  tipoPagoDiasLabel,
  type DiaProgramado,
  type ModalidadPago,
  type TipoPagoDias,
} from "@/utils/productionFlow";

type AssignmentItem = {
  id: number;
  metaIndividual?: number | null;
  estado: string;
  empleadoId: number | null;
  empleadoNombre: string;
  asignacionOrdenCuadrillaId: number | null;
  ordenTrabajoId: number | null;
  cantidadAsignadaCuadrilla?: number | null;
  cantidadAprobadaAcumulada?: number | null;
  cantidadPendiente?: number | null;
  puedeEditar?: boolean;
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
  estado?: string | null;
  empleadoEstado?: string | null;
};

type MiembroCuadrillaApi = {
  id: number;
  empleadoId: number;
  cuadrillaId: number;
  estado?: string | null;
  empleado?: {
    primerNombre?: string | null;
    segundoNombre?: string | null;
    primerApellido?: string | null;
    segundoApellido?: string | null;
    codigoEmpleado?: string | null;
    estado?: string | null;
    puesto?: { nombre?: string | null } | null;
    positionWorker?: { nombre?: string | null } | null;
    pstPuesto?: number | null;
  } | null;
  puesto?: { nombre?: string | null } | null;
};

type AssignmentPanel = {
  id: number;
  estado: string;
  cantidadAsignada: number;
  modalidadPago?: ModalidadPago | string | null;
  tipoPagoDias?: TipoPagoDias | string | null;
  montoDiario?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  diasSeleccionados?: number | null;
  totalDias?: number | null;
  montoTotalProyectado?: number | null;
  diasProgramados?: DiaProgramado[] | null;
  orden?: {
    id: number;
    numeroOrden: string;
    estado: string;
    pagoUnitario?: number | null;
  } | null;
  cuadrilla?: {
    id: number;
    nombre: string;
    codigoCuadrilla?: string | null;
  } | null;
  miembros?: PanelMember[];
  existingAssignments?: AssignmentItem[];
};

const fetchPanels = () =>
  api
    .get<ApiEnvelope<AssignmentPanel[]>>("/employee-assignment/panels")
    .then((response) => response.data.data);

const fetchAssignments = () =>
  api
    .get<ApiEnvelope<AssignmentItem[]>>("/employee-assignment")
    .then((response) => response.data.data);

const fetchMiembrosCuadrilla = () =>
  api
    .get<ApiEnvelope<MiembroCuadrillaApi[]> | { data: MiembroCuadrillaApi[] }>("/miembros-cuadrilla")
    .then((response) => response.data.data ?? [])
    .catch(() => [] as MiembroCuadrillaApi[]);

const getPanelDays = (panel: AssignmentPanel | null) =>
  panel
    ? Number(panel.diasSeleccionados ?? panel.totalDias ?? calculateInclusiveDays(panel.fechaInicio, panel.fechaFin))
    : 0;

const getProjectedAmount = (panel: AssignmentPanel | null) => {
  if (!panel) return 0;
  return Number(panel.montoTotalProyectado ?? Number(panel.montoDiario ?? 0) * getPanelDays(panel));
};

const buildMemberName = (miembro: MiembroCuadrillaApi) => {
  const empleado = miembro.empleado;
  const parts = [
    empleado?.primerNombre,
    empleado?.segundoNombre,
    empleado?.primerApellido,
    empleado?.segundoApellido,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : `Empleado #${miembro.empleadoId}`;
};

const getPuestoName = (miembro: MiembroCuadrillaApi) =>
  miembro.puesto?.nombre ??
  miembro.empleado?.puesto?.nombre ??
  miembro.empleado?.positionWorker?.nombre ??
  null;

const normalizePanelMember = (member: PanelMember): PanelMember => ({
  ...member,
  estado: member.estado ?? "ACTIVO",
  empleadoEstado: member.empleadoEstado ?? "ACTIVO",
});

const mergeMembers = (fromPanel: PanelMember[], fromCuadrilla: PanelMember[]) => {
  const map = new Map<number, PanelMember>();

  [...fromPanel, ...fromCuadrilla].forEach((member) => {
    if (!isActiveStatus(member.estado ?? "ACTIVO")) return;
    if (!isActiveStatus(member.empleadoEstado ?? "ACTIVO")) return;
    map.set(member.empleadoId, normalizePanelMember(member));
  });

  return Array.from(map.values());
};

export default function EmployeeAssignmentPage() {
  const [selectedPanelId, setSelectedPanelId] = useState<number | "">("");
  const [search, setSearch] = useState("");

  const { data: panels = [], isLoading: loadingPanels } = useQuery({
    queryKey: ["employee-assignment-panels"],
    queryFn: fetchPanels,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["employee-assignment"],
    queryFn: fetchAssignments,
  });

  const { data: miembrosCuadrilla = [] } = useQuery({
    queryKey: ["miembros-cuadrilla"],
    queryFn: fetchMiembrosCuadrilla,
  });

  const selectedPanel = useMemo(
    () => panels.find((item) => item.id === Number(selectedPanelId)) ?? null,
    [panels, selectedPanelId],
  );

  const miembrosPorCuadrilla = useMemo(() => {
    const map = new Map<number, PanelMember[]>();

    miembrosCuadrilla.forEach((miembro) => {
      if (!isActiveStatus(miembro.estado ?? "ACTIVO")) return;
      if (!isActiveStatus(miembro.empleado?.estado ?? "ACTIVO")) return;

      const current = map.get(miembro.cuadrillaId) ?? [];
      current.push({
        empleadoId: miembro.empleadoId,
        empleadoNombre: buildMemberName(miembro),
        puestoNombre: getPuestoName(miembro),
        estado: miembro.estado ?? "ACTIVO",
        empleadoEstado: miembro.empleado?.estado ?? "ACTIVO",
      });
      map.set(miembro.cuadrillaId, current);
    });

    return map;
  }, [miembrosCuadrilla]);

  const getPanelMembers = (panel: AssignmentPanel | null) => {
    if (!panel) return [] as PanelMember[];
    const membersFromPanel = (panel.miembros ?? []).map(normalizePanelMember);
    const membersFromCuadrilla = miembrosPorCuadrilla.get(panel.cuadrilla?.id ?? 0) ?? [];
    return mergeMembers(membersFromPanel, membersFromCuadrilla);
  };

  const selectedPanelMembers = useMemo(
    () => getPanelMembers(selectedPanel),
    [selectedPanel, miembrosPorCuadrilla],
  );

  const modalidadSeleccionada = normalizeModalidadPago(selectedPanel?.modalidadPago);
  const diasSeleccionados = getPanelDays(selectedPanel);

  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assignments;
    return assignments.filter((item) => {
      const text =
        `${item.id} ${item.empleadoNombre} ${item.cuadrilla?.nombre ?? ""} ${item.ordenTrabajoId ?? ""}`.toLowerCase();
      return text.includes(term);
    });
  }, [assignments, search]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">
            Control de Orden por Cuadrilla
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualiza la modalidad definida para la orden. Las metas individuales ya no se distribuyen entre operarios.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Paneles activos", value: panels.length, color: "text-gray-900" },
          {
            label: "Modalidad destajo",
            value: panels.filter((item) => normalizeModalidadPago(item.modalidadPago) === "DESTAJO").length,
            color: "text-[#2D6A4F]",
          },
          {
            label: "Pago por días",
            value: panels.filter((item) => normalizeModalidadPago(item.modalidadPago) === "PAGO_POR_DIAS").length,
            color: "text-amber-600",
          },
          {
            label: "Operarios vinculados",
            value: panels.reduce((sum, item) => sum + getPanelMembers(item).length, 0),
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
            onChange={(e) => setSelectedPanelId(e.target.value === "" ? "" : Number(e.target.value))}
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
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 space-y-1">
                <p className="font-semibold text-gray-900 mb-1">Resumen del panel</p>
                <p>
                  Orden: <strong>{selectedPanel.orden?.numeroOrden ?? "-"}</strong>
                </p>
                <p>
                  Cuadrilla: <strong>{selectedPanel.cuadrilla?.nombre ?? "-"}</strong>
                </p>
                <p>
                  Modalidad: <strong>{modalidadLabel[modalidadSeleccionada]}</strong>
                </p>
                <p>
                  Estado de orden: <strong>{selectedPanel.orden?.estado ?? "-"}</strong>
                </p>
                <p>
                  Miembros activos: <strong>{selectedPanelMembers.length}</strong>
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-4 space-y-1">
                <p className="font-semibold text-gray-900 mb-1">Base de cálculo</p>
                {modalidadSeleccionada === "DESTAJO" ? (
                  <>
                    <p>
                      Cantidad de referencia de cuadrilla: <strong>{selectedPanel.cantidadAsignada}</strong>
                    </p>
                    <p>
                      Pago unitario: <strong>{money(selectedPanel.orden?.pagoUnitario)} / pieza</strong>
                    </p>
                    <p className="text-xs text-gray-500">
                      Esta cantidad ya no se reparte como meta individual; cada operario reporta libremente su producción.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Variante: <strong>{tipoPagoDiasLabel[normalizeTipoPagoDias(selectedPanel.tipoPagoDias)]}</strong>
                    </p>
                    <p>
                      Rango: <strong>{normalizeDateInput(selectedPanel.fechaInicio) || "-"} → {normalizeDateInput(selectedPanel.fechaFin) || "-"}</strong>
                    </p>
                    <p>
                      Días seleccionados: <strong>{getDiasText(diasSeleccionados)}</strong>
                    </p>
                    <p>
                      Monto diario: <strong>{money(selectedPanel.montoDiario)}</strong>
                    </p>
                    <p>
                      Total proyectado: <strong>{money(getProjectedAmount(selectedPanel))}</strong>
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Detalle por miembro</h2>
              <p className="text-sm text-gray-500">
                Los operarios quedan vinculados a la orden sin meta individual asignada.
              </p>
            </div>
          </div>

          {!selectedPanel ? (
            <p className="text-center py-12 text-gray-400">
              Selecciona un panel para ver la cuadrilla asignada.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Empleado", "Puesto", "Tipo de reporte", "Aprobado acumulado", "Estado"].map((header) => (
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
                  {selectedPanelMembers.map((member, index) => {
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
                        <td className="px-4 py-3 text-gray-700">
                          Reporte libre según modalidad de la orden
                        </td>
                        <td className="px-4 py-3 text-[#2D6A4F] font-semibold">
                          {current?.cantidadAprobadaAcumulada ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={current?.estado ?? selectedPanel.estado ?? "ACTIVA"} color="green" />
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
            <h2 className="text-lg font-semibold text-gray-900">Vinculaciones registradas</h2>
            <p className="text-sm text-gray-500">
              Vista temporal por empleado, orden y cuadrilla. La meta individual queda sustituida por la modalidad del panel.
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
          <p className="text-center py-12 text-gray-400">Sin vinculaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {["Asignación", "Empleado", "Cuadrilla", "Referencia", "Aprobada", "Estado", "Editable"].map((header) => (
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
                    <td className="px-4 py-3 text-gray-900">
                      {item.cantidadAsignadaCuadrilla ?? item.metaIndividual ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-[#2D6A4F] font-semibold">
                      {item.cantidadAprobadaAcumulada ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={item.estado}
                        color={isActiveStatus(item.estado) ? "green" : "gray"}
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

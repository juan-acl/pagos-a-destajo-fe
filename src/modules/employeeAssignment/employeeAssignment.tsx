import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import Toast from "@/components/ui/Toast";
import Pagination from "@/components/ui/Pagination";
import DriveTooltip from "@/components/ui/DriveTooltip";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";
import { useTour } from "@/hooks/useTour";
import { useAuthStore } from "@/store/authStore";
import { EMPLOYEE_ASSIGNMENT_TOUR_STEPS } from "./tour";

type AssignmentItem = {
  id: number;
  metaIndividual: number;
  estado: string;
  empleadoId: number | null;
  empleadoNombre: string;
  asignacionOrdenCuadrillaId: number | null;
  ordenTrabajoId: number | null;
  modalidad?: "DESTAJO" | "PAGO_POR_DIAS" | string;
  cantidadAsignadaCuadrilla: number | null;
  cantidadReferencia?: number | null;
  cantidadAprobadaAcumulada: number;
  reportesPendientes?: number;
  puedeEditar: boolean;
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

type PanelMember = {
  empleadoId: number;
  empleadoNombre: string;
  puestoNombre?: string | null;
};

type AssignmentPanel = {
  id: number;
  estado: string;
  modalidad: "DESTAJO" | "PAGO_POR_DIAS" | string;
  cantidadAsignada: number;
  orden?: {
    id: number;
    numeroOrden: string;
    estado: string;
    modalidad?: string;
    pagoUnitario?: number;
  } | null;
  cuadrilla?: {
    id: number;
    nombre: string;
    codigoCuadrilla?: string | null;
  } | null;
  miembros: PanelMember[];
  miembrosActivos: number;
  assignedTotal: number;
  remaining: number;
  allowEdit: boolean;
  blockedReason?: string | null;
  existingAssignments: AssignmentItem[];
  requiereRegistroDias?: boolean;
  requiereRevisionProduccion?: boolean;
  pagoUnitario?: number;
};

const fetchPanels = () =>
  api
    .get<ApiEnvelope<AssignmentPanel[]>>("/employee-assignment/panels")
    .then((response) => response.data.data);

const fetchAssignments = () =>
  api
    .get<ApiEnvelope<AssignmentItem[]>>("/employee-assignment")
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

export default function EmployeeAssignmentPage() {
  const qc = useQueryClient();
  const { empleado } = useAuthStore();
  const [selectedPanelId, setSelectedPanelId] = useState<number | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [membersPage, setMembersPage] = useState(1);
  const [assignmentsPage, setAssignmentsPage] = useState(1);

  const { startTour } = useTour(
    EMPLOYEE_ASSIGNMENT_TOUR_STEPS,
    "employee-assignment",
    empleado?.id,
  );

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

  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assignments;
    return assignments.filter((item) => {
      const text = `${item.id} ${item.empleadoNombre} ${item.cuadrilla?.nombre ?? ""} ${item.orden?.numeroOrden ?? ""} ${item.modalidad ?? ""}`.toLowerCase();
      return text.includes(term);
    });
  }, [assignments, search]);

  const visibleAssignments = useMemo(
    () => paginate(filteredAssignments, assignmentsPage),
    [filteredAssignments, assignmentsPage],
  );

  const visibleMembers = useMemo(
    () => paginate(selectedPanel?.miembros ?? [], membersPage),
    [selectedPanel, membersPage],
  );

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["employee-assignment-panels"] }),
      qc.invalidateQueries({ queryKey: ["employee-assignment"] }),
      qc.invalidateQueries({ queryKey: ["production-review-pending"] }),
      qc.invalidateQueries({ queryKey: ["production-lot-candidates"] }),
    ]);
  };

  const syncAssignments = useMutation({
    mutationFn: async (panelId: number) =>
      api.post("/employee-assignment/distribute", {
        asignacionOrdenCuadrillaId: panelId,
        modo: "SINCRONIZAR",
        metas: [],
      }),
    onSuccess: async (response) => {
      setMessage(null);
      setSuccess(response.data?.data?.mensaje ?? "Empleados sincronizados correctamente.");
      await invalidate();
    },
    onError: (error) => {
      setSuccess(null);
      setMessage(getErrorMessage(error));
    },
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-7">
        <div id="employee-assignment-title">
          <h1 className="text-2xl font-bold text-gray-900 m-0">Asignaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sincroniza los empleados de la cuadrilla según la modalidad definida en la orden de trabajo.
          </p>
        </div>
        <button
          id="employee-assignment-ayuda-btn"
          type="button"
          onClick={startTour}
          className="bg-white text-[#2D6A4F] border border-[#2D6A4F] text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer hover:bg-[#f0fdf4]"
        >
          ¿Necesitas ayuda?
        </button>
      </div>

      <Toast message={message} type="error" onClose={() => setMessage(null)} />
      <Toast message={success} type="success" onClose={() => setSuccess(null)} />

      <div id="employee-assignment-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Paneles activos", value: panels.length, color: "text-gray-900" },
          {
            label: "Destajo",
            value: panels.filter((item) => normalize(item.modalidad) === "DESTAJO").length,
            color: "text-[#2D6A4F]",
          },
          {
            label: "Pago por día",
            value: panels.filter((item) => normalize(item.modalidad) === "PAGO_POR_DIAS").length,
            color: "text-amber-600",
          },
          {
            label: "Empleados sincronizados",
            value: assignments.filter((item) => normalize(item.estado).startsWith("ACTIV")).length,
            color: "text-blue-600",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[360px,1fr] gap-6 mb-6">
        <div id="employee-assignment-selector" className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="inline-flex items-center gap-1">
              Orden y cuadrilla
              <DriveTooltip
                id="ea-tooltip-orden-cuadrilla"
                title="Orden y cuadrilla"
                description="Selecciona la orden asignada a una cuadrilla. La modalidad de pago ya viene definida desde la orden de trabajo."
                side="right"
                align="start"
              />
            </span>
          </label>
          <select
            value={selectedPanelId}
            onChange={(e) => {
              setSelectedPanelId(e.target.value === "" ? "" : Number(e.target.value));
              setMembersPage(1);
              setMessage(null);
              setSuccess(null);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
          >
            <option value="">Selecciona una asignación de orden a cuadrilla</option>
            {panels.map((panel) => (
              <option key={panel.id} value={panel.id}>
                {panel.orden?.numeroOrden ?? `Orden #${panel.orden?.id ?? "-"}`} · {panel.cuadrilla?.nombre ?? `Cuadrilla #${panel.cuadrilla?.id ?? "-"}`} · {modalityLabel(panel.modalidad)}
              </option>
            ))}
          </select>

          {selectedPanel && (
            <div className="mt-5 space-y-3 text-sm text-gray-700">
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 space-y-1">
                <p className="font-semibold text-gray-900 mb-1 inline-flex items-center gap-1">
                  Resumen del panel
                  <DriveTooltip
                    id="ea-tooltip-resumen-panel"
                    title="Resumen del panel"
                    description="Muestra la orden, cuadrilla, estado, cantidad asignada y cuántos empleados ya están sincronizados para este flujo."
                    side="right"
                    align="start"
                  />
                </p>
                <p>Orden: <strong>{selectedPanel.orden?.numeroOrden ?? "-"}</strong></p>
                <p>Cuadrilla: <strong>{selectedPanel.cuadrilla?.nombre ?? "-"}</strong></p>
                <p>Estado de orden: <strong>{selectedPanel.orden?.estado ?? "-"}</strong></p>
                <p>Cantidad asignada a cuadrilla: <strong>{selectedPanel.cantidadAsignada}</strong></p>
                <p>Miembros activos: <strong>{selectedPanel.miembrosActivos}</strong></p>
                <p>Sincronizados: <strong>{selectedPanel.assignedTotal}</strong></p>
                <div className="pt-2">
                  <Badge label={modalityLabel(selectedPanel.modalidad)} color={modalityColor(selectedPanel.modalidad) as any} />
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 p-4 space-y-2">
                <p className="font-semibold text-gray-900 inline-flex items-center gap-1">
                  Flujo aplicado
                  <DriveTooltip
                    id="ea-tooltip-flujo-aplicado"
                    title="Flujo aplicado"
                    description="Indica si la orden seguirá el flujo de destajo o de pago por día. En pago por día, este módulo no registra días; solo sincroniza empleados."
                    side="right"
                    align="start"
                  />
                </p>
                {normalize(selectedPanel.modalidad) === "PAGO_POR_DIAS" ? (
                  <p className="text-amber-700">
                    Esta orden se paga por día. Este módulo solo sincroniza empleados; el registro de días se mantiene en Gestión de Días.
                  </p>
                ) : (
                  <p className="text-[#2D6A4F]">
                    Esta orden trabaja por destajo. Los empleados sincronizados podrán reportar producción y pasar a revisión.
                  </p>
                )}
              </div>

              {selectedPanel.blockedReason && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {selectedPanel.blockedReason}
                </p>
              )}

              <button
                type="button"
                onClick={() => syncAssignments.mutate(selectedPanel.id)}
                disabled={!selectedPanel.allowEdit || syncAssignments.isPending}
                className="w-full bg-[#2D6A4F] disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors border-0 cursor-pointer"
              >
                {syncAssignments.isPending ? "Sincronizando..." : "Sincronizar empleados"}
              </button>
            </div>
          )}
        </div>

        <div id="employee-assignment-members-table" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-1">
              Miembros de la cuadrilla
              <DriveTooltip
                id="ea-tooltip-miembros-cuadrilla"
                title="Miembros de la cuadrilla"
                description="Lista los empleados activos de la cuadrilla seleccionada. Aquí no se asignan metas individuales; solo se verifica si ya están sincronizados."
                side="bottom"
                align="start"
              />
            </h2>
            <p className="text-sm text-gray-500">Se muestran sin metas individuales; la modalidad viene desde la orden.</p>
          </div>

          {!selectedPanel ? (
            <p className="text-center py-12 text-gray-400">Selecciona un panel para ver sus miembros.</p>
          ) : selectedPanel.miembros.length === 0 ? (
            <p className="text-center py-12 text-gray-400">La cuadrilla no tiene miembros activos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Empleado", "Puesto", "Estado", "Reportes pendientes", "Aprobado"].map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map((member, index) => {
                    const current = selectedPanel.existingAssignments.find((item) => Number(item.empleadoId) === Number(member.empleadoId));
                    return (
                      <tr key={member.empleadoId} className={`border-t border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{member.empleadoNombre}</td>
                        <td className="px-4 py-3 text-gray-600">{member.puestoNombre ?? "-"}</td>
                        <td className="px-4 py-3">
                          <Badge label={current ? "SINCRONIZADO" : "PENDIENTE"} color={current ? "green" : "amber"} />
                        </td>
                        <td className="px-4 py-3 text-amber-700 font-semibold">{current?.reportesPendientes ?? 0}</td>
                        <td className="px-4 py-3 text-[#2D6A4F] font-semibold">{current?.cantidadAprobadaAcumulada ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination
                page={membersPage}
                total={selectedPanel.miembros.length}
                pageSize={DISPLAY_LIMIT}
                itemLabel="miembro(s)"
                onPageChange={setMembersPage}
              />
            </div>
          )}
        </div>
      </div>

      <div id="employee-assignment-registered-table" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-1">
              Asignaciones registradas
              <DriveTooltip
                id="ea-tooltip-asignaciones-registradas"
                title="Asignaciones registradas"
                description="Consulta la relación entre empleado, orden, cuadrilla y modalidad. Usa el buscador para encontrar registros específicos."
                side="bottom"
                align="start"
              />
            </h2>
            <p className="text-sm text-gray-500">Relación empleado, orden, cuadrilla y modalidad definida desde la orden.</p>
          </div>
          <input
            placeholder="Buscar por empleado, orden, cuadrilla o modalidad..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setAssignmentsPage(1);
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 min-w-[280px]"
          />
        </div>

        {loadingPanels || loadingAssignments ? (
          <p className="text-center py-12 text-gray-400">Cargando...</p>
        ) : filteredAssignments.length === 0 ? (
          <p className="text-center py-12 text-gray-400">Sin asignaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {["Asignación", "Empleado", "Orden", "Cuadrilla", "Modalidad", "Aprobado", "Estado"].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleAssignments.map((item, index) => (
                  <tr key={item.id} className={`border-t border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 font-semibold text-gray-900">#{item.id}</td>
                    <td className="px-4 py-3 text-gray-700">{item.empleadoNombre}</td>
                    <td className="px-4 py-3 text-gray-700">{item.orden?.numeroOrden ?? item.ordenTrabajoId ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{item.cuadrilla?.nombre ?? "-"}</td>
                    <td className="px-4 py-3"><Badge label={modalityLabel(item.modalidad)} color={modalityColor(item.modalidad) as any} /></td>
                    <td className="px-4 py-3 text-[#2D6A4F] font-semibold">{item.cantidadAprobadaAcumulada ?? 0}</td>
                    <td className="px-4 py-3"><Badge label={item.estado} color={normalize(item.estado).startsWith("ACTIV") ? "green" : "gray"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={assignmentsPage}
              total={filteredAssignments.length}
              pageSize={DISPLAY_LIMIT}
              itemLabel="asignación(es)"
              onPageChange={setAssignmentsPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

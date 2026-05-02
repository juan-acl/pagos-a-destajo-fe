import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import Badge from "@/components/ui/badge";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";

type PaymentMode = "DESTAJO" | "PAGO_POR_DIAS";
type DayVariant = "DIAS_VENCIDOS" | "DIAS_FUTUROS";

type ControlRow = {
  id: number;
  base: string;
  fecha?: string | null;
  vigente: boolean;
  monto: number;
};

type AssignmentPanel = {
  id: number;
  estado: string;
  cantidadAsignada: number;
  orden?: {
    id: number;
    numeroOrden: string;
    estado: string;
    pagoUnitario?: number;
  } | null;
  cuadrilla?: {
    id: number;
    nombre: string;
    codigoCuadrilla?: string | null;
  } | null;
  miembrosActivos: number;
  ordenHabilitada: boolean;
  blockedReason?: string | null;
  modalidad: PaymentMode | null;
  cantidadReferencia: number | null;
  pagoUnitario: number;
  montoDiario: number | null;
  varianteDias: DayVariant | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  diasSeleccionados: number;
  diasVigentes: number;
  diasPendientes: number;
  montoTotalProyectado: number;
  montoPagableActual: number;
  controles: ControlRow[];
};

type ModalityForm = {
  modalidad: PaymentMode;
  varianteDias: DayVariant;
  montoDiario: string;
  fechaInicio: string;
  fechaFin: string;
};

const formatMoney = (value: number | string | null | undefined) =>
  `Q ${Number(value ?? 0).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fetchPanels = () =>
  api
    .get<ApiEnvelope<AssignmentPanel[]>>("/employee-assignment/panels")
    .then((response) => response.data.data);

const todayInput = () => new Date().toISOString().slice(0, 10);

export default function EmployeeAssignmentPage() {
  const qc = useQueryClient();
  const [selectedPanelId, setSelectedPanelId] = useState<number | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ModalityForm>({
    modalidad: "DESTAJO",
    varianteDias: "DIAS_VENCIDOS",
    montoDiario: "",
    fechaInicio: todayInput(),
    fechaFin: todayInput(),
  });

  const { data: panels = [], isLoading } = useQuery({
    queryKey: ["employee-assignment-panels"],
    queryFn: fetchPanels,
  });

  const selectedPanel = useMemo(
    () => panels.find((item) => item.id === Number(selectedPanelId)) ?? null,
    [panels, selectedPanelId],
  );

  useEffect(() => {
    if (!selectedPanel) return;

    setForm({
      modalidad: selectedPanel.modalidad ?? "DESTAJO",
      varianteDias: selectedPanel.varianteDias ?? "DIAS_VENCIDOS",
      montoDiario: selectedPanel.montoDiario != null ? String(selectedPanel.montoDiario) : "",
      fechaInicio: selectedPanel.fechaInicio ?? todayInput(),
      fechaFin: selectedPanel.fechaFin ?? todayInput(),
    });
  }, [selectedPanel]);

  const selectedDays = useMemo(() => {
    if (!form.fechaInicio || !form.fechaFin) return 0;
    const start = new Date(`${form.fechaInicio}T00:00:00`);
    const end = new Date(`${form.fechaFin}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  }, [form.fechaInicio, form.fechaFin]);

  const projectedAmount = selectedDays * Number(form.montoDiario || 0);

  const stats = useMemo(() => {
    const withModality = panels.filter((item) => item.modalidad).length;
    return [
      { label: "Paneles", value: panels.length, color: "text-gray-900" },
      { label: "Con modalidad", value: withModality, color: "text-[#2D6A4F]" },
      { label: "Destajo", value: panels.filter((item) => item.modalidad === "DESTAJO").length, color: "text-blue-600" },
      { label: "Pago por días", value: panels.filter((item) => item.modalidad === "PAGO_POR_DIAS").length, color: "text-amber-600" },
    ];
  }, [panels]);

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["employee-assignment-panels"] }),
      qc.invalidateQueries({ queryKey: ["employee-assignment"] }),
      qc.invalidateQueries({ queryKey: ["production-review-pending"] }),
      qc.invalidateQueries({ queryKey: ["production-lot-candidates"] }),
      qc.invalidateQueries({ queryKey: ["planilla"] }),
    ]);
  };

  const saveModality = useMutation({
    mutationFn: async () => {
      if (!selectedPanel) throw new Error("Selecciona una orden y cuadrilla.");
      return api.post(
        "/employee-assignment/modality",
        {
          asignacionOrdenCuadrillaId: selectedPanel.id,
          modalidad: form.modalidad,
          varianteDias: form.modalidad === "PAGO_POR_DIAS" ? form.varianteDias : undefined,
          montoDiario: form.modalidad === "PAGO_POR_DIAS" ? Number(form.montoDiario) : undefined,
          fechaInicio: form.modalidad === "PAGO_POR_DIAS" ? form.fechaInicio : undefined,
          fechaFin: form.modalidad === "PAGO_POR_DIAS" ? form.fechaFin : undefined,
        },
        { headers: { "x-user-role": "JEFE" } },
      );
    },
    onSuccess: async () => {
      setMessage("Modalidad registrada correctamente.");
      await invalidate();
    },
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const disabledSave =
    !selectedPanel ||
    !selectedPanel.ordenHabilitada ||
    saveModality.isPending ||
    (form.modalidad === "PAGO_POR_DIAS" &&
      (!form.montoDiario || Number(form.montoDiario) <= 0 || selectedDays <= 0));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">Asignación de Orden y Modalidad de Pago</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define si la orden de la cuadrilla se controlará por destajo o por días.
          </p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${message.includes("correctamente") ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[380px,1fr] gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Orden y cuadrilla</label>
            <select
              value={selectedPanelId}
              onChange={(e) => {
                setSelectedPanelId(e.target.value === "" ? "" : Number(e.target.value));
                setMessage(null);
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Selecciona una asignación de orden a cuadrilla</option>
              {panels.map((panel) => (
                <option key={panel.id} value={panel.id}>
                  {panel.orden?.numeroOrden ?? `Orden #${panel.orden?.id ?? "-"}`} · {panel.cuadrilla?.nombre ?? `Cuadrilla #${panel.cuadrilla?.id ?? "-"}`}
                </option>
              ))}
            </select>
          </div>

          {selectedPanel && (
            <>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700">
                <p>Orden: <strong>{selectedPanel.orden?.numeroOrden ?? "-"}</strong></p>
                <p>Cuadrilla: <strong>{selectedPanel.cuadrilla?.nombre ?? "-"}</strong></p>
                <p>Estado de orden: <strong>{selectedPanel.orden?.estado ?? "-"}</strong></p>
                <p>Miembros activos: <strong>{selectedPanel.miembrosActivos}</strong></p>
                <p>Cantidad asignada: <strong>{selectedPanel.cantidadAsignada}</strong></p>
                <p>Pago unitario: <strong>{formatMoney(selectedPanel.pagoUnitario)}</strong></p>
              </div>

              {selectedPanel.blockedReason && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {selectedPanel.blockedReason}
                </p>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Modalidad</label>
                <select
                  value={form.modalidad}
                  onChange={(e) => setForm((prev) => ({ ...prev, modalidad: e.target.value as PaymentMode }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
                >
                  <option value="DESTAJO">DESTAJO</option>
                  <option value="PAGO_POR_DIAS">PAGO POR DÍAS</option>
                </select>
              </div>

              {form.modalidad === "DESTAJO" ? (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  La cantidad asignada queda solo como referencia general de producción. Ya no se generan metas individuales por trabajador.
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Variante</label>
                    <select
                      value={form.varianteDias}
                      onChange={(e) => setForm((prev) => ({ ...prev, varianteDias: e.target.value as DayVariant }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
                    >
                      <option value="DIAS_VENCIDOS">Días vencidos</option>
                      <option value="DIAS_FUTUROS">Días futuros / programados</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Monto diario</label>
                    <input
                      type="number"
                      min={0}
                      value={form.montoDiario}
                      onChange={(e) => setForm((prev) => ({ ...prev, montoDiario: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha inicial</label>
                      <input
                        type="date"
                        value={form.fechaInicio}
                        onChange={(e) => setForm((prev) => ({ ...prev, fechaInicio: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha final</label>
                      <input
                        type="date"
                        value={form.fechaFin}
                        onChange={(e) => setForm((prev) => ({ ...prev, fechaFin: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-100 p-4 text-sm text-gray-700">
                    <p>Días seleccionados: <strong>{selectedDays}</strong></p>
                    <p>Total proyectado: <strong>{formatMoney(projectedAmount)}</strong></p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => saveModality.mutate()}
                disabled={disabledSave}
                className="w-full bg-[#2D6A4F] disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors border-0 cursor-pointer"
              >
                Guardar modalidad de pago
              </button>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Resumen de modalidad</h2>
            <p className="text-sm text-gray-500">Consulta cómo quedó configurada la orden para la cuadrilla.</p>
          </div>

          {!selectedPanel ? (
            <p className="text-center py-12 text-gray-400">Selecciona un panel para ver su modalidad.</p>
          ) : (
            <div className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Modalidad actual</p>
                  <Badge label={selectedPanel.modalidad ?? "SIN DEFINIR"} color={selectedPanel.modalidad ? "green" : "gray"} />
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Referencia de producción</p>
                  <p className="text-xl font-bold text-gray-900">{selectedPanel.cantidadReferencia ?? selectedPanel.cantidadAsignada}</p>
                </div>
              </div>

              {selectedPanel.modalidad === "PAGO_POR_DIAS" && (
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Monto diario</p>
                    <p className="text-lg font-bold text-gray-900">{formatMoney(selectedPanel.montoDiario)}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Días</p>
                    <p className="text-lg font-bold text-gray-900">{selectedPanel.diasSeleccionados}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Vigentes</p>
                    <p className="text-lg font-bold text-[#2D6A4F]">{selectedPanel.diasVigentes}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Pendientes</p>
                    <p className="text-lg font-bold text-amber-600">{selectedPanel.diasPendientes}</p>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-gray-100 p-4 text-sm text-gray-700">
                <p>Rango: <strong>{selectedPanel.fechaInicio ?? "-"}</strong> a <strong>{selectedPanel.fechaFin ?? "-"}</strong></p>
                <p>Total proyectado: <strong>{formatMoney(selectedPanel.montoTotalProyectado)}</strong></p>
                <p>Monto pagable vigente: <strong>{formatMoney(selectedPanel.montoPagableActual)}</strong></p>
              </div>

              {selectedPanel.controles?.length > 0 && (
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {['ID', 'Tipo', 'Fecha', 'Monto', 'Vigente'].map((header) => (
                          <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPanel.controles.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-semibold">#{row.id}</td>
                          <td className="px-4 py-3">{row.base}</td>
                          <td className="px-4 py-3">{row.fecha ?? '-'}</td>
                          <td className="px-4 py-3">{formatMoney(row.monto)}</td>
                          <td className="px-4 py-3"><Badge label={row.vigente ? 'SI' : 'NO'} color={row.vigente ? 'green' : 'gray'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isLoading && <p className="text-center py-6 text-gray-400">Cargando paneles...</p>}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import { useAuthStore } from "@/store/authStore";
import Badge from "@/components/ui/badge";

type OrdenTrabajo = { id: number; numeroOrden: string; cantidadRequerida: number; pagoUnitario: number; fechaLimite: string; estado: string; modalidad: string; };
type AsignacionOrden = { id: number; ordenTrabajoId: number; cuadrillaId: number; cantidadAsignada: number; estado: string; };
type Reporte = { id: number; cantidadRecibida: number; cantidadAprobada: number; estadoRevision: string; observaciones?: string; fechaRevision: string; fecha_creacion: string; };
type Pago = { id: number; numeroPago: number; montoTotal: number; estado: string; fechaPago: string; metodoPago: string; numeroLote: string; cantidadAprobada: number; };
type Panel = {
  miembro: any;
  asignacionOrden: AsignacionOrden | null;
  ordenTrabajo: OrdenTrabajo | null;
  ultimoReporte: Reporte | null;
  historial: Reporte[];
  pagos: Pago[];
  yaReporto: boolean;
  ordenInvalida?: boolean;
};

const fetchPanel = (empleadoId: number) =>
  api.get<{ data: Panel }>(`/empleados/panel/${empleadoId}`).then(r => r.data.data);

const colorEstado = (estado: string) =>
  estado === "APROBADO" ? "green" : estado === "PENDIENTE_REVISION" ? "amber" : estado === "RECHAZADO" ? "red" : "gray";

const formatFecha = (fecha: string) =>
  new Date(fecha).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });

export default function PanelOperario() {
  const { empleado } = useAuthStore();
  const qc = useQueryClient();
  const [cantidad, setCantidad] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"panel" | "historial" | "pagos">("panel");

  const { data: panel, isLoading } = useQuery({
    queryKey: ["panel", empleado?.id],
    queryFn: () => fetchPanel(empleado!.id),
    enabled: !!empleado,
  });

  const crear = useMutation({
    mutationFn: (data: any) => api.post(`/empleados/${empleado!.id}/reporte`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["panel", empleado?.id] });
      setCantidad("");
      setError("");
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message ?? "Error al enviar el reporte. Intenta de nuevo.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const num = Number(cantidad);
    if (!num || num <= 0) { setError("Ingresa una cantidad válida mayor a 0."); return; }
    if (num > 9999) { setError("La cantidad parece incorrecta. Verifica el dato ingresado."); return; }
    crear.mutate({
      cantidadRecibida: num,
      reportadorId: empleado!.id,
    });
  };

  if (isLoading) return (
    <div className="max-w-2xl mx-auto py-20 text-center text-gray-400 text-sm">Cargando tu panel...</div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 m-0">Mi Panel</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bienvenido, <span className="font-semibold text-[#2D6A4F]">{empleado?.primerNombre} {empleado?.primerApellido}</span>
        </p>
      </div>

      {/* Info empleado */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-sm font-bold shrink-0">
          {empleado?.primerNombre[0]}{empleado?.primerApellido[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{empleado?.primerNombre} {empleado?.primerApellido}</p>
          <p className="text-xs text-gray-400">{empleado?.email}</p>
          <p className="text-xs text-gray-400 font-mono">{empleado?.codigoEmpleado ?? "-"}</p>
        </div>
        {panel?.miembro && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Cuadrilla</p>
            <p className="text-sm font-bold text-[#2D6A4F]">#{panel.miembro.cuadrillaId}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {[
          { key: "panel", label: "Mi reporte" },
          { key: "historial", label: `Historial (${panel?.historial?.length ?? 0})` },
          { key: "pagos", label: `Mis pagos (${panel?.pagos?.length ?? 0})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg border-0 cursor-pointer transition-all ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "bg-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Mi reporte */}
      {tab === "panel" && (
        <>
          {/* Sin cuadrilla */}
          {!panel?.miembro && (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Sin cuadrilla asignada</h2>
              <p className="text-sm text-gray-500">No perteneces a ninguna cuadrilla activa. Consulta con tu supervisor.</p>
            </div>
          )}

          {/* Sin orden activa */}
          {panel?.miembro && !panel?.asignacionOrden && (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Sin orden activa</h2>
              <p className="text-sm text-gray-500">Tu cuadrilla no tiene una orden de trabajo asignada en este momento.</p>
            </div>
          )}

          {/* Orden inválida */}
          {panel?.ordenInvalida && (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Orden no disponible</h2>
              <p className="text-sm text-gray-500">
                La orden asignada no está en proceso o no es de modalidad DESTAJO.
                Estado actual: <span className="font-semibold">{panel.ordenTrabajo?.estado ?? "-"}</span>
              </p>
            </div>
          )}

          {/* Panel activo */}
          {panel?.asignacionOrden && panel?.ordenTrabajo && !panel?.ordenInvalida && (
            <>
              {/* Card orden activa */}
              <div className="bg-[#2D6A4F] rounded-2xl p-6 mb-6 text-white">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-1">Orden activa</p>
                <div className="flex items-end gap-3 mb-3">
                  <span className="text-3xl font-black">{panel.ordenTrabajo.numeroOrden}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-white/60 text-xs mb-1">Modalidad</p>
                    <p className="text-white font-bold text-sm">{panel.ordenTrabajo.modalidad}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-white/60 text-xs mb-1">Cantidad requerida</p>
                    <p className="text-white font-bold text-sm">{panel.ordenTrabajo.cantidadRequerida} piezas</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-white/60 text-xs mb-1">Pago unitario</p>
                    <p className="text-white font-bold text-sm">Q{Number(panel.ordenTrabajo.pagoUnitario).toFixed(2)}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-white/60 text-xs mb-1">Cuadrilla</p>
                    <p className="text-white font-bold text-sm">#{panel.asignacionOrden.cuadrillaId}</p>
                  </div>
                </div>
                {panel.ordenTrabajo.fechaLimite && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-300" />
                    <span className="text-white/70 text-xs">Fecha límite: {formatFecha(panel.ordenTrabajo.fechaLimite)}</span>
                  </div>
                )}
              </div>

              {/* Último reporte */}
              {panel.ultimoReporte && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Último reporte</p>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {panel.ultimoReporte.cantidadRecibida}
                        <span className="text-sm font-normal text-gray-400 ml-2">piezas reportadas</span>
                      </p>
                      {panel.ultimoReporte.estadoRevision === "APROBADO" && (
                        <p className="text-sm text-[#2D6A4F] font-medium mt-1">{panel.ultimoReporte.cantidadAprobada} piezas aprobadas</p>
                      )}
                    </div>
                    <Badge label={panel.ultimoReporte.estadoRevision} color={colorEstado(panel.ultimoReporte.estadoRevision)} />
                  </div>
                  <p className="text-xs text-gray-400">{formatFecha(panel.ultimoReporte.fechaRevision)}</p>
                  {panel.ultimoReporte.observaciones && (
                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2">{panel.ultimoReporte.observaciones}</p>
                  )}
                </div>
              )}

              {/* Formulario */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Reportar producción</p>
                <form onSubmit={handleSubmit}>
                  <label className="flex flex-col gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                    Cantidad producida
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="9999"
                        placeholder="Ej. 85"
                        value={cantidad}
                        onChange={e => { setCantidad(e.target.value); setError(""); }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-2xl font-bold text-gray-900 outline-none focus:border-[#2D6A4F] focus:bg-white transition-all font-normal normal-case tracking-normal"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">piezas</span>
                    </div>
                  </label>

                  {error && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={crear.isPending || !cantidad}
                    className="w-full bg-[#2D6A4F] text-white rounded-xl py-3.5 font-bold text-sm border-0 cursor-pointer hover:bg-[#245a42] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {crear.isPending ? "Enviando..." : "Enviar reporte"}
                    {!crear.isPending && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </>
      )}

      {/* TAB: Historial */}
      {tab === "historial" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {!panel?.historial?.length ? (
            <p className="text-center py-12 text-gray-400 text-sm">Sin reportes anteriores</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {["Fecha", "Reportado", "Aprobado", "Estado", "Observaciones"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {panel.historial.map((r, i) => (
                  <tr key={r.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatFecha(r.fechaRevision)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{r.cantidadRecibida}</td>
                    <td className="px-4 py-3 text-[#2D6A4F] font-semibold">{r.cantidadAprobada}</td>
                    <td className="px-4 py-3"><Badge label={r.estadoRevision} color={colorEstado(r.estadoRevision)} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{r.observaciones ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB: Pagos */}
      {tab === "pagos" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {!panel?.pagos?.length ? (
            <p className="text-center py-12 text-gray-400 text-sm">Sin pagos registrados</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 p-5 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total pagado</p>
                  <p className="text-2xl font-bold text-[#2D6A4F]">
                    Q{panel.pagos.filter(p => p.estado === "PAGADO").reduce((s, p) => s + Number(p.montoTotal), 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total pagos</p>
                  <p className="text-2xl font-bold text-gray-900">{panel.pagos.length}</p>
                </div>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Planilla", "Lote", "Aprobado", "Monto", "Método", "Estado"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {panel.pagos.map((p, i) => (
                    <tr key={p.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="px-4 py-3 font-semibold text-gray-900">#{p.numeroPago}</td>
                      <td className="px-4 py-3 text-gray-500">#{p.numeroLote}</td>
                      <td className="px-4 py-3 text-gray-900">{p.cantidadAprobada} pzas</td>
                      <td className="px-4 py-3 font-bold text-[#2D6A4F]">Q{Number(p.montoTotal).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.metodoPago}</td>
                      <td className="px-4 py-3"><Badge label={p.estado} color={colorEstado(p.estado)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
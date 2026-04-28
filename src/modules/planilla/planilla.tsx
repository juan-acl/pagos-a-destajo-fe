import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import type { Modalidad, DetalleEmpleadoDia } from "@/types/planilla.types";
import { isPreviewDia } from "@/types/planilla.types";
import DataTable from "@/components/commons/DataTable";
import { s } from "@/styles/planilla.styles";
import {
  emptyEvidencia,
  buildEvidencia,
  type EvidenciaForm,
  type OrdenTrabajo,
  type Planilla,
} from "@/types/planilla.types";
import {
  fetchPlanillas,
  fetchPlanillasPendientes,
  fetchPreviewByOrden,
  fetchOrdenesDisponibles,
  fetchDetallePlanilla,
  generarPlanillaByOrden,
  ejecutarPago,
  rechazarPlanilla,
} from "@/api/planilla.api";
import Modal from "@/components/ui/Modal";
import Stats from "@/components/commons/stats";
import Filters, { type Option } from "@/components/commons/filters";
import { planillaStats } from "@/constants/planilla.constants";
import { useFilter } from "@/hooks/useFilter";
import { getErrorMessage } from "@/utils/api";
import { BarChart, CircleCheckBig, CircleX } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

function modalidadLabel(m?: Modalidad | string | null) {
  return m === "PAGO_POR_DIAS" ? "Por día" : "Destajo";
}

function modalidadColor(m?: Modalidad | string | null) {
  return m === "PAGO_POR_DIAS" ? "#d97706" : "#16a34a";
}

function planillaHeadersDestajo() {
  return [
    "Empleado",
    "Meta ind.",
    "Prod. real",
    "Cumpl. %",
    "Monto meta",
    "Monto real",
  ];
}

function planillaHeadersDia() {
  return ["Empleado", "Días reconocidos", "Tarifa/día", "Monto individual"];
}

function estadoBadge(estado: string) {
  if (estado === "PENDIENTE")
    return <span style={s.badgePendiente}>{estado}</span>;
  if (estado === "EN_REVISION")
    return <span style={s.badgeEnRevision}>{estado}</span>;
  if (estado === "PROCESANDO")
    return <span style={s.badgeProcesando}>{estado}</span>;
  if (estado === "PAGADO") return <span style={s.activo}>{estado}</span>;
  if (estado === "PAGO_REALIZADO")
    return <span style={s.activo}>PAGO REALIZADO</span>;
  if (estado === "RECHAZADO") return <span style={s.inactivo}>{estado}</span>;
  return <span style={s.badgeGris}>{estado}</span>;
}

const numericEvidencia = new Set(["montoConfirmado"]);

export default function Planilla() {
  const qc = useQueryClient();

  const [generarOpen, setGenerarOpen] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<OrdenTrabajo | null>(null);

  const [ejecutarOpen, setEjecutarOpen] = useState(false);
  const [selectedPlanilla, setSelectedPlanilla] = useState<Planilla | null>(
    null,
  );
  const [evidencia, setEvidencia] = useState<EvidenciaForm>(emptyEvidencia(0));

  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [rechazarId, setRechazarId] = useState(0);
  const [observaciones, setObservaciones] = useState("");

  const [detalleId, setDetalleId] = useState<number | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rango de fechas para PAGO_POR_DIAS
  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaFin, setFechaFin] = useState(today);

  const { data = [], isLoading } = useQuery({
    queryKey: ["planilla"],
    queryFn: fetchPlanillas,
  });

  const { data: ordenes = [] } = useQuery({
    queryKey: ["ordenes-trabajo"],
    queryFn: fetchOrdenesDisponibles,
  });

  const { data: pendientes = [] } = useQuery({
    queryKey: ["planilla-pendientes"],
    queryFn: fetchPlanillasPendientes,
  });

  const { data: detalle, isLoading: detalleLoading } = useQuery({
    queryKey: ["planilla-detalle", detalleId],
    queryFn: () => fetchDetallePlanilla(detalleId!),
    enabled: detalleId !== null,
    retry: false,
  });

  const esPorDias = selectedOrden?.modalidad === "PAGO_POR_DIAS";

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: [
      "planilla-preview-orden",
      selectedOrden?.id,
      esPorDias ? fechaInicio : null,
      esPorDias ? fechaFin : null,
    ],
    queryFn: () =>
      fetchPreviewByOrden(
        selectedOrden!.id,
        esPorDias ? fechaInicio : undefined,
        esPorDias ? fechaFin : undefined,
      ),
    enabled:
      !!selectedOrden &&
      generarOpen &&
      (!esPorDias || (!!fechaInicio && !!fechaFin)),
    retry: false,
  });

  const { filteredData, setFilter, activeFilters, setSearch, search } =
    useFilter({
      data,
      filterableFields: ["estado", "metodoPago"],
      exactMatchFields: ["estado"],
    });

  const stats = useMemo(
    () =>
      planillaStats.map((stat) => {
        if (stat.label === "Total") return { ...stat, value: data.length };
        if (stat.label === "Pendientes")
          return { ...stat, value: pendientes.length };
        if (stat.label === "Pagadas")
          return {
            ...stat,
            value: data.filter((p) => p.estado === "PAGADO").length,
          };
        return stat;
      }),
    [data, pendientes],
  );

  const optionsEstado: Option[] = useMemo(() => {
    const seen = new Set<string>();
    return data.reduce<Option[]>((acc, p) => {
      if (!seen.has(p.estado)) {
        seen.add(p.estado);
        acc.push({ id: p.id, nombre: p.estado });
      }
      return acc;
    }, []);
  }, [data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["planilla"] });
    qc.invalidateQueries({ queryKey: ["planilla-pendientes"] });
    setErrorMsg(null);
  };

  const mutGenerar = useMutation({
    mutationFn: () =>
      generarPlanillaByOrden(
        selectedOrden!.id,
        esPorDias ? { fechaInicio, fechaFin } : undefined,
      ),
    onSuccess: () => {
      invalidate();
      setGenerarOpen(false);
      setSelectedOrden(null);
    },
    onError: (e) => setErrorMsg(getErrorMessage(e)),
  });

  const mutEjecutar = useMutation({
    mutationFn: () =>
      ejecutarPago(selectedPlanilla!.id, buildEvidencia(evidencia)),
    onSuccess: () => {
      invalidate();
      setEjecutarOpen(false);
      setSelectedPlanilla(null);
    },
    onError: (e) => setErrorMsg(getErrorMessage(e)),
  });

  const mutRechazar = useMutation({
    mutationFn: () => rechazarPlanilla(rechazarId, observaciones),
    onSuccess: () => {
      invalidate();
      setRechazarOpen(false);
      setRechazarId(0);
      setObservaciones("");
    },
    onError: (e) => setErrorMsg(getErrorMessage(e)),
  });

  const openEjecutar = (p: Planilla) => {
    setSelectedPlanilla(p);
    setEvidencia(emptyEvidencia(p.montoTotal));
    setErrorMsg(null);
    setEjecutarOpen(true);
  };

  const openRechazar = (p: Planilla) => {
    setRechazarId(p.id);
    setObservaciones("");
    setErrorMsg(null);
    setRechazarOpen(true);
  };

  const changeEvidencia = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setEvidencia((prev) => ({
      ...prev,
      [name]: numericEvidencia.has(name) ? Number(value) : value,
    }));
  };

  const columns: ColumnDef<Planilla, unknown>[] = [
    {
      accessorKey: "codigoPlanilla",
      header: "Código",
      cell: (info) =>
        (info.getValue() as string | null) ??
        `#${(info.row.original as Planilla).numeroPago}`,
    },
    {
      accessorKey: "modalidad",
      header: "Modalidad",
      cell: (info) => {
        const m = info.getValue() as Modalidad | null;
        return (
          <span
            style={{ color: modalidadColor(m), fontWeight: 600, fontSize: 12 }}
          >
            {modalidadLabel(m)}
          </span>
        );
      },
    },
    {
      accessorKey: "loteProduccion.numeroLote",
      header: "Lote",
      cell: (info) => (info.getValue() as string) ?? "-",
    },
    {
      accessorKey: "montoTotal",
      header: "Monto Total",
      cell: (info) => `Q ${(info.getValue() as number).toFixed(2)}`,
    },
    { accessorKey: "metodoPago", header: "Método" },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: (info) => estadoBadge(info.getValue() as string),
    },
    {
      accessorKey: "fechaCreacion",
      header: "Fecha",
      cell: (info) =>
        new Date(info.getValue() as string).toLocaleDateString("es-GT"),
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original;
        const canAct = p.estado === "PENDIENTE" || p.estado === "EN_REVISION";
        return (
          <div
            style={{ display: "flex", gap: "8px", justifyContent: "center" }}
          >
            <button
              style={s.btnIcon}
              title="Ver resultados"
              onClick={() => setDetalleId(p.id)}
            >
              <BarChart />
            </button>
            {canAct && (
              <>
                <button style={s.btnEjecutar} onClick={() => openEjecutar(p)}>
                  <CircleCheckBig />
                </button>
                <button style={s.btnRechazar} onClick={() => openRechazar(p)}>
                  <CircleX />
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Planillas</h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
            Genere y gestione las planillas de pago vinculadas a lotes de
            producción.
          </p>
        </div>
        <button
          style={s.btnPrimary}
          onClick={() => {
            setErrorMsg(null);
            setSelectedOrden(null);
            setGenerarOpen(true);
          }}
        >
          + Generar planilla
        </button>
      </div>

      <Stats data={stats} />

      <Filters
        search={search}
        setSearch={setSearch}
        filterValue=""
        setFilterValue={() => {}}
        filterEstado={(activeFilters.estado as string) ?? ""}
        setFilterEstado={(val) => setFilter("estado", val)}
        options2={optionsEstado}
        placeholder="Buscar por estado o método de pago..."
        label1="Planilla"
        label2="Estado"
      />

      <div style={s.card}>
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
        />
      </div>

      <Modal
        open={generarOpen}
        title="Generar Planilla"
        subtitle="Seleccione el lote de producción para generar la planilla de pago."
        onClose={() => setGenerarOpen(false)}
      >
        {errorMsg && <div style={s.error}>{errorMsg}</div>}
        <div style={s.grid}>
          <label style={{ ...s.label, gridColumn: "1 / -1" }}>
            Orden de trabajo *
            <select
              value={selectedOrden?.id ?? 0}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedOrden(ordenes.find((o) => o.id === id) ?? null);
              }}
              required
              style={s.input}
            >
              <option value={0}>Seleccionar orden...</option>
              {ordenes.map((o) => (
                <option key={o.id} value={o.id}>
                  #{o.numeroOrden} [{modalidadLabel(o.modalidad)}] — Q{" "}
                  {Number(o.pagoUnitario).toFixed(2)}
                  {o.modalidad === "PAGO_POR_DIAS" ? "/día" : "/pieza"}
                </option>
              ))}
            </select>
          </label>
          {selectedOrden && (
            <div
              style={{
                ...s.label,
                gridColumn: "1 / -1",
                flexDirection: "row",
                gap: "16px",
                color: "#64748b",
                fontSize: "13px",
                flexWrap: "wrap",
              }}
            >
              <span>
                Cantidad requerida:{" "}
                <strong>{selectedOrden.cantidadRequerida}</strong>
              </span>
              <span>
                Modalidad:{" "}
                <strong
                  style={{ color: modalidadColor(selectedOrden?.modalidad) }}
                >
                  {modalidadLabel(selectedOrden?.modalidad)}
                </strong>
              </span>
              <span>
                Estado: <strong>{selectedOrden.estado}</strong>
              </span>
            </div>
          )}

          {selectedOrden?.modalidad === "PAGO_POR_DIAS" && (
            <>
              <label style={s.label}>
                Fecha inicio *
                <input
                  type="date"
                  value={fechaInicio}
                  max={fechaFin}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  style={s.input}
                  required
                />
              </label>
              <label style={s.label}>
                Fecha fin *
                <input
                  type="date"
                  value={fechaFin}
                  min={fechaInicio}
                  onChange={(e) => setFechaFin(e.target.value)}
                  style={s.input}
                  required
                />
              </label>
            </>
          )}
        </div>

        {!!selectedOrden && (
          <div style={s.previewBox}>
            {previewLoading ? (
              <p style={{ fontSize: "13px", color: "#64748b" }}>
                Calculando resultados...
              </p>
            ) : preview ? (
              <>
                <div style={s.previewHeader}>
                  <span style={s.previewTitle}>
                    Integrantes de la cuadrilla
                  </span>
                  <span style={s.previewMonto}>
                    <strong
                      style={{ color: modalidadColor(selectedOrden.modalidad) }}
                    >
                      {modalidadLabel(selectedOrden.modalidad)}
                    </strong>
                    &nbsp;·&nbsp;Total a pagar:{" "}
                    <strong>Q {preview.montoTotal.toFixed(2)}</strong>
                  </span>
                </div>

                {isPreviewDia(preview) ? (
                  <table style={s.previewTable}>
                    <thead>
                      <tr>
                        {planillaHeadersDia().map((h) => (
                          <th key={h} style={s.previewTh}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.detalle.map((d: DetalleEmpleadoDia) => (
                        <tr key={d.empleadoId}>
                          <td style={s.previewTd}>{d.nombreEmpleado}</td>
                          <td
                            style={{
                              ...s.previewTd,
                              fontWeight: 600,
                              color: "#2D6A4F",
                            }}
                          >
                            {d.diasReconocidos}
                          </td>
                          <td style={s.previewTd}>
                            Q {d.montoDiario.toFixed(2)}
                          </td>
                          <td style={{ ...s.previewTd, fontWeight: 700 }}>
                            Q {d.montoIndividual.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td
                          colSpan={3}
                          style={{
                            ...s.previewTh,
                            textAlign: "right",
                            paddingTop: "10px",
                          }}
                        >
                          Total a pagar:
                        </td>
                        <td
                          style={{
                            ...s.previewTh,
                            color: "#1e293b",
                            fontSize: "14px",
                          }}
                        >
                          Q {preview.montoTotal.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <table style={s.previewTable}>
                    <thead>
                      <tr>
                        {planillaHeadersDestajo().map((h) => (
                          <th key={h} style={s.previewTh}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.detalle.map((d) => {
                        const cumpl =
                          d.metaIndividual > 0
                            ? Math.round(
                                (d.cantidadAprobada / d.metaIndividual) * 100,
                              )
                            : 0;
                        const cumplStyle: React.CSSProperties = {
                          ...s.previewTd,
                          color:
                            cumpl >= 100
                              ? "#16a34a"
                              : cumpl >= 75
                                ? "#d97706"
                                : "#dc2626",
                          fontWeight: 600,
                        };
                        return (
                          <tr key={d.empleadoId}>
                            <td style={s.previewTd}>{d.nombreEmpleado}</td>
                            <td style={s.previewTd}>{d.metaIndividual}</td>
                            <td style={s.previewTd}>{d.cantidadAprobada}</td>
                            <td style={cumplStyle}>{cumpl}%</td>
                            <td style={s.previewTd}>
                              Q {d.montoMeta.toFixed(2)}
                            </td>
                            <td style={s.previewTd}>
                              Q {d.montoRealizado.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            ...s.previewTh,
                            textAlign: "right",
                            paddingTop: "10px",
                          }}
                        >
                          Total a pagar:
                        </td>
                        <td
                          style={{
                            ...s.previewTh,
                            color: "#1e293b",
                            fontSize: "14px",
                          }}
                        >
                          Q {preview.montoTotal.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </>
            ) : (
              <p style={{ fontSize: "13px", color: "#ef4444" }}>
                {esPorDias && (!fechaInicio || !fechaFin)
                  ? "Seleccione el rango de fechas para calcular."
                  : "No se pudo obtener la información para esta orden."}
              </p>
            )}
          </div>
        )}

        <div style={s.row}>
          <button
            style={s.btnPrimary}
            disabled={!selectedOrden || !preview || mutGenerar.isPending}
            onClick={() => mutGenerar.mutate()}
          >
            {mutGenerar.isPending ? "Generando..." : "Confirmar y generar"}
          </button>
          <button
            type="button"
            style={s.btnSecondary}
            onClick={() => setGenerarOpen(false)}
          >
            Cancelar
          </button>
        </div>
      </Modal>

      <Modal
        open={ejecutarOpen}
        title="Ejecutar Pago"
        subtitle={
          selectedPlanilla
            ? `Planilla #${selectedPlanilla.codigoPlanilla ?? selectedPlanilla.numeroPago} — Total: Q ${selectedPlanilla.montoTotal.toFixed(2)}`
            : "Complete la evidencia del pago."
        }
        onClose={() => setEjecutarOpen(false)}
      >
        {errorMsg && <div style={s.error}>{errorMsg}</div>}

        {selectedPlanilla && (
          <div
            style={{
              marginBottom: "14px",
              padding: "10px 14px",
              borderRadius: "6px",
              background:
                selectedPlanilla.modalidad === "PAGO_POR_DIAS"
                  ? "#fef3c7"
                  : "#dcfce7",
              border: `1px solid ${selectedPlanilla.modalidad === "PAGO_POR_DIAS" ? "#fcd34d" : "#86efac"}`,
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color:
                  selectedPlanilla.modalidad === "PAGO_POR_DIAS"
                    ? "#92400e"
                    : "#166534",
              }}
            >
              Modalidad: {modalidadLabel(selectedPlanilla.modalidad)}
            </span>
            {selectedPlanilla.modalidad === "PAGO_POR_DIAS" ? (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "12px",
                  color: "#92400e",
                }}
              >
                Pago directo por día — no requiere validación de lotes ni
                revisiones.
              </p>
            ) : (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "12px",
                  color: "#166534",
                }}
              >
                Pago por destajo — se verificarán revisiones y lotes aprobados
                antes de procesar.
              </p>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutEjecutar.mutate();
          }}
        >
          <div style={s.grid}>
            <label style={s.label}>
              Método de pago *
              <select
                name="metodoPago"
                value={evidencia.metodoPago}
                onChange={changeEvidencia}
                required
                style={s.input}
              >
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                <option value="CHEQUE">CHEQUE</option>
              </select>
            </label>

            <label style={s.label}>
              Monto confirmado *
              <input
                name="montoConfirmado"
                type="number"
                step="0.01"
                value={evidencia.montoConfirmado}
                readOnly
                style={s.inputReadonly}
              />
            </label>

            {evidencia.metodoPago === "EFECTIVO" && (
              <>
                <label style={s.label}>
                  Responsable de entrega *
                  <input
                    name="responsableEntrega"
                    value={evidencia.responsableEntrega}
                    onChange={changeEvidencia}
                    required
                    style={s.input}
                  />
                </label>
                <label style={s.label}>
                  Fecha de entrega *
                  <input
                    name="fechaEntrega"
                    type="date"
                    value={evidencia.fechaEntrega}
                    onChange={changeEvidencia}
                    required
                    style={s.input}
                  />
                </label>
              </>
            )}

            {evidencia.metodoPago === "TRANSFERENCIA" && (
              <>
                <label style={s.label}>
                  Banco destino *
                  <input
                    name="bancoDestino"
                    value={evidencia.bancoDestino}
                    onChange={changeEvidencia}
                    required
                    style={s.input}
                  />
                </label>
                <label style={s.label}>
                  Número de cuenta *
                  <input
                    name="numeroCuenta"
                    value={evidencia.numeroCuenta}
                    onChange={changeEvidencia}
                    required
                    style={s.input}
                  />
                </label>
                <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                  Número de transferencia *
                  <input
                    name="numeroTransferencia"
                    value={evidencia.numeroTransferencia}
                    onChange={changeEvidencia}
                    required
                    style={s.input}
                  />
                </label>
              </>
            )}

            {evidencia.metodoPago === "CHEQUE" && (
              <>
                <label style={s.label}>
                  Número de cheque *
                  <input
                    name="numeroCheque"
                    value={evidencia.numeroCheque}
                    onChange={changeEvidencia}
                    required
                    style={s.input}
                  />
                </label>
                <label style={s.label}>
                  Banco emisor *
                  <input
                    name="bancoEmisor"
                    value={evidencia.bancoEmisor}
                    onChange={changeEvidencia}
                    required
                    style={s.input}
                  />
                </label>
                <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                  Fecha del cheque *
                  <input
                    name="fechaCheque"
                    type="date"
                    value={evidencia.fechaCheque}
                    onChange={changeEvidencia}
                    required
                    style={s.input}
                  />
                </label>
              </>
            )}
          </div>

          <div style={s.row}>
            <button
              type="submit"
              style={s.btnPrimary}
              disabled={mutEjecutar.isPending}
            >
              {mutEjecutar.isPending ? "Procesando..." : "Ejecutar pago"}
            </button>
            <button
              type="button"
              style={s.btnSecondary}
              onClick={() => setEjecutarOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Resultados de producción */}
      <Modal
        open={detalleId !== null}
        title="Resultados de producción"
        subtitle={
          detalle
            ? `${detalle.planilla.codigoPlanilla ?? `#${detalle.planilla.numeroPago}`} · ${modalidadLabel(detalle.modalidad)} · Q ${detalle.pagoUnitario.toFixed(2)}${detalle.modalidad === "PAGO_POR_DIAS" ? "/día" : "/pieza"}${detalle.lote ? ` · Lote ${detalle.lote.numeroLote}` : ""}`
            : "Cargando..."
        }
        onClose={() => setDetalleId(null)}
      >
        {detalleLoading ? (
          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Cargando resultados...
          </p>
        ) : detalle ? (
          <>
            {detalle.modalidad === "PAGO_POR_DIAS" ? (
              <table style={s.previewTable}>
                <thead>
                  <tr>
                    {planillaHeadersDia().map((h) => (
                      <th key={h} style={s.previewTh}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalle.detalle.map((d: any) => (
                    <tr key={d.empleadoId}>
                      <td style={s.previewTd}>{d.nombreEmpleado}</td>
                      <td
                        style={{
                          ...s.previewTd,
                          fontWeight: 600,
                          color: "#2D6A4F",
                        }}
                      >
                        {d.diasReconocidos}
                      </td>
                      <td style={s.previewTd}>
                        Q {Number(d.montoDiario).toFixed(2)}
                      </td>
                      <td style={{ ...s.previewTd, fontWeight: 700 }}>
                        Q {Number(d.montoIndividual).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        ...s.previewTh,
                        textAlign: "right",
                        paddingTop: "10px",
                      }}
                    >
                      Total a pagar:
                    </td>
                    <td
                      style={{
                        ...s.previewTh,
                        color: "#1e293b",
                        fontSize: "14px",
                      }}
                    >
                      Q {detalle.montoTotal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <table style={s.previewTable}>
                <thead>
                  <tr>
                    {planillaHeadersDestajo().map((h) => (
                      <th key={h} style={s.previewTh}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalle.detalle.map((d: any) => {
                    const cumpl =
                      d.metaIndividual > 0
                        ? Math.round(
                            (d.cantidadAprobada / d.metaIndividual) * 100,
                          )
                        : 0;
                    const cumplStyle: React.CSSProperties = {
                      ...s.previewTd,
                      color:
                        cumpl >= 100
                          ? "#16a34a"
                          : cumpl >= 75
                            ? "#d97706"
                            : "#dc2626",
                      fontWeight: 600,
                    };
                    return (
                      <tr key={d.empleadoId}>
                        <td style={s.previewTd}>{d.nombreEmpleado}</td>
                        <td style={s.previewTd}>{d.metaIndividual}</td>
                        <td style={s.previewTd}>{d.cantidadAprobada}</td>
                        <td style={cumplStyle}>{cumpl}%</td>
                        <td style={s.previewTd}>Q {d.montoMeta.toFixed(2)}</td>
                        <td style={s.previewTd}>
                          Q {d.montoRealizado.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        ...s.previewTh,
                        textAlign: "right",
                        paddingTop: "10px",
                      }}
                    >
                      Total a pagar:
                    </td>
                    <td
                      style={{
                        ...s.previewTh,
                        color: "#1e293b",
                        fontSize: "14px",
                      }}
                    >
                      Q {detalle.montoTotal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </>
        ) : (
          <p style={{ fontSize: "13px", color: "#ef4444" }}>
            No se pudieron cargar los resultados de esta planilla.
          </p>
        )}
        <div style={s.row}>
          <button style={s.btnSecondary} onClick={() => setDetalleId(null)}>
            Cerrar
          </button>
        </div>
      </Modal>

      {/* Modal: Rechazar planilla */}
      <Modal
        open={rechazarOpen}
        title="Rechazar Planilla"
        subtitle="Indique el motivo del rechazo de esta planilla."
        onClose={() => setRechazarOpen(false)}
      >
        {errorMsg && <div style={s.error}>{errorMsg}</div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutRechazar.mutate();
          }}
        >
          <div style={s.grid}>
            <label style={{ ...s.label, gridColumn: "1 / -1" }}>
              Observaciones *
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                required
                rows={4}
                style={{ ...s.input, resize: "vertical" }}
                placeholder="Describa el motivo del rechazo..."
              />
            </label>
          </div>
          <div style={s.row}>
            <button
              type="submit"
              style={{ ...s.btnPrimary, background: "#ef4444" }}
              disabled={mutRechazar.isPending}
            >
              {mutRechazar.isPending ? "Rechazando..." : "Rechazar"}
            </button>
            <button
              type="button"
              style={s.btnSecondary}
              onClick={() => setRechazarOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

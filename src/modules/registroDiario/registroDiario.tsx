import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, CalendarDays } from "lucide-react"; // Se agregó CalendarDays aquí
import api from "@/api";
import Modal from "@/components/ui/Modal";
import { s } from "@/styles/planilla.styles";
import {
  registrarDias,
  activarVigencia,
  fetchRegistrosPorOrden,
} from "@/api/planilla.api";
import type { OrdenTrabajo, RegistroDiario } from "@/types/planilla.types";
import { getErrorMessage } from "@/utils/api";
import { useTour } from "@/hooks/useTour";
import { useAuthStore } from "@/store/authStore";
import { REGISTRO_TOUR_STEPS } from "./tour";

const today = new Date().toISOString().split("T")[0];

function estadoBadge(estado: string) {
  if (estado === "HABILITADO_PARA_PAGO")
    return (
      <span style={{ ...s.activo, whiteSpace: "nowrap" }}>
        Habilitado para pago
      </span>
    );
  if (estado === "PROGRAMADO")
    return (
      <span style={{ ...s.badgePendiente, whiteSpace: "nowrap" }}>
        Programado
      </span>
    );
  if (estado === "PAGADO")
    return <span style={{ ...s.badgeGris, whiteSpace: "nowrap" }}>Pagado</span>;
  return <span style={s.badgeGris}>{estado}</span>;
}

const fetchOrdenesPorDias = () =>
  api
    .get<{ data: OrdenTrabajo[] }>("/ordenes-trabajo")
    .then((r) => r.data.data.filter((o) => o.modalidad === "PAGO_POR_DIAS"));

function OrderCombobox({
  ordenes,
  ordenesLoading,
  selectedOrdenId,
  onChange,
}: {
  ordenes: OrdenTrabajo[];
  ordenesLoading: boolean;
  selectedOrdenId: number | null;
  onChange: (orden: OrdenTrabajo | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOrden = ordenes.find((o) => o.id === selectedOrdenId) ?? null;

  const filtered = ordenes.filter((o) => {
    const q = query.toLowerCase();
    return (
      o.numeroOrden.toLowerCase().includes(q) ||
      o.estado.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const select = (o: OrdenTrabajo | null) => {
    onChange(o);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...s.input,
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: selectedOrden ? "#1e293b" : "#94a3b8",
          background: "#fff",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedOrden
            ? `#${selectedOrden.numeroOrden} — Q ${Number(selectedOrden.pagoUnitario).toFixed(2)}/día (${selectedOrden.estado})`
            : "Seleccionar orden..."}
        </span>
        <ChevronDown
          size={14}
          style={{ flexShrink: 0, marginLeft: 6, color: "#94a3b8" }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "8px 8px 4px" }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
              }}
              placeholder="Buscar por número de orden..."
              style={{ ...s.input, width: "100%", boxSizing: "border-box" }}
            />
          </div>
          <ul
            style={{
              maxHeight: "220px",
              overflowY: "auto",
              margin: 0,
              padding: "4px 0 6px",
              listStyle: "none",
            }}
          >
            {selectedOrden && (
              <li
                onClick={() => select(null)}
                style={{
                  padding: "7px 12px",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "#94a3b8",
                  borderLeft: "2px solid transparent",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLLIElement).style.background =
                    "#f8fafc")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLLIElement).style.background =
                    "transparent")
                }
              >
                Limpiar selección
              </li>
            )}
            {ordenesLoading ? (
              <li
                style={{
                  padding: "10px 12px",
                  fontSize: "13px",
                  color: "#94a3b8",
                }}
              >
                Cargando...
              </li>
            ) : filtered.length === 0 ? (
              <li
                style={{
                  padding: "10px 12px",
                  fontSize: "13px",
                  color: "#94a3b8",
                }}
              >
                Sin resultados
              </li>
            ) : (
              filtered.map((o) => {
                const isSelected = o.id === selectedOrdenId;
                return (
                  <li
                    key={o.id}
                    onClick={() => select(o)}
                    style={{
                      padding: "8px 12px",
                      fontSize: "13px",
                      cursor: "pointer",
                      background: isSelected ? "#f0fdf4" : "transparent",
                      color: isSelected ? "#166534" : "#1e293b",
                      borderLeft: isSelected
                        ? "2px solid #2D6A4F"
                        : "2px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLLIElement).style.background =
                          "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLLIElement).style.background =
                          "transparent";
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>#{o.numeroOrden}</span>
                    {" — Q "}
                    {Number(o.pagoUnitario).toFixed(2)}/día
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "11px",
                        color: isSelected ? "#166534" : "#64748b",
                      }}
                    >
                      ({o.estado})
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function RegistroDiarioPage() {
  const qc = useQueryClient();
  const { empleado } = useAuthStore();
  const { startTour } = useTour(REGISTRO_TOUR_STEPS, "registro-diario", empleado?.id);

  const [selectedOrdenId, setSelectedOrdenId] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaFin, setFechaFin] = useState(today);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: ordenes = [], isLoading: ordenesLoading } = useQuery({
    queryKey: ["ordenes-pago-dias"],
    queryFn: fetchOrdenesPorDias,
  });

  const selectedOrden = ordenes.find((o) => o.id === selectedOrdenId) ?? null;

  const { data: registros = [], isLoading: registrosLoading } = useQuery({
    queryKey: ["registros-diarios", selectedOrdenId],
    queryFn: () => fetchRegistrosPorOrden(selectedOrdenId!),
    enabled: selectedOrdenId !== null,
  });

  const totalProgramados = registros.filter(
    (r) => r.estado === "PROGRAMADO",
  ).length;
  const totalHabilitados = registros.filter(
    (r) => r.estado === "HABILITADO_PARA_PAGO",
  ).length;
  const totalPagados = registros.filter((r) => r.estado === "PAGADO").length;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["registros-diarios", selectedOrdenId] });
    setErrorMsg(null);
  };

  const mutRegistrar = useMutation({
    mutationFn: () =>
      registrarDias({ ordenId: selectedOrdenId!, fechaInicio, fechaFin }),
    onSuccess: (data) => {
      invalidate();
      setConfirmOpen(false);
      setSuccessMsg(
        `Se registraron ${data.diasCreados} día(s) para ${data.empleados} empleado(s).`,
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (e) => {
      setConfirmOpen(false);
      setErrorMsg(getErrorMessage(e));
    },
  });

  const mutVigencia = useMutation({
    mutationFn: () => activarVigencia(selectedOrdenId!),
    onSuccess: (data) => {
      invalidate();
      setSuccessMsg(
        data.activados > 0
          ? `${data.activados} día(s) habilitados para pago.`
          : "No hay días nuevos para habilitar.",
      );
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (e) => setErrorMsg(getErrorMessage(e)),
  });

  const handleOrdenChange = (orden: OrdenTrabajo | null) => {
    setSelectedOrdenId(orden?.id ?? null);
    setErrorMsg(null);
    if (orden) {
      const minDate = orden.fechaCreacion.split("T")[0];
      const maxDate = orden.fechaLimite
        ? orden.fechaLimite.split("T")[0]
        : undefined;
      const newInicio =
        today >= minDate && (!maxDate || today <= maxDate) ? today : minDate;
      const newFin = maxDate ?? today;
      setFechaInicio(newInicio);
      setFechaFin(newFin >= newInicio ? newFin : newInicio);
    } else {
      setFechaInicio(today);
      setFechaFin(today);
    }
  };

  const canRegistrar =
    selectedOrdenId !== null &&
    !!fechaInicio &&
    !!fechaFin &&
    fechaInicio <= fechaFin;

  return (
    <div className="max-w-7xl mx-auto">
      <div style={s.header}>
        <div id="registro-title" style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <CalendarDays size={28} style={{ color: "#2D6A4F", marginTop: "2px" }} />
          <div>
            <h1 style={{ ...s.title, margin: 0 }}>Gestión de Días</h1>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
              Registre y administre los días laborales de las órdenes con
              modalidad Pago por Día.
            </p>
          </div>
        </div>
        <button id="registro-ayuda-btn" style={s.btnHelp} onClick={startTour}>
          ¿Necesitas ayuda?
        </button>
      </div>

      {errorMsg && (
        <div style={{ ...s.error, marginBottom: "16px" }}>{errorMsg}</div>
      )}
      {successMsg && (
        <div
          style={{
            background: "#dcfce7",
            border: "1px solid #bbf7d0",
            color: "#166534",
            borderRadius: "6px",
            padding: "10px 14px",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {successMsg}
        </div>
      )}

      <div style={{ ...s.card, marginBottom: "20px" }}>
        <p style={{ ...s.subtitle, marginBottom: "14px" }}>Registrar días</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr auto",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <label id="registro-orden" style={s.label}>
            Orden de trabajo (Pago por día)
            <OrderCombobox
              ordenes={ordenes}
              ordenesLoading={ordenesLoading}
              selectedOrdenId={selectedOrdenId}
              onChange={handleOrdenChange}
            />
          </label>

          <label id="registro-fechas" style={s.label}>
            Fecha inicio
            <input
              type="date"
              value={fechaInicio}
              min={selectedOrden?.fechaCreacion?.split("T")[0]}
              max={fechaFin}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={s.input}
            />
          </label>

          <label style={s.label}>
            Fecha fin
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio}
              max={
                selectedOrden?.fechaLimite
                  ? selectedOrden.fechaLimite.split("T")[0]
                  : undefined
              }
              onChange={(e) => setFechaFin(e.target.value)}
              style={s.input}
            />
          </label>

          <button
            id="registro-registrar-btn"
            style={{
              ...s.btnPrimary,
              opacity: canRegistrar ? 1 : 0.5,
              cursor: canRegistrar ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
            }}
            disabled={!canRegistrar}
            onClick={() => {
              setErrorMsg(null);
              setConfirmOpen(true);
            }}
          >
            Registrar días
          </button>
        </div>

        {selectedOrden && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              background: "#f0fdf4",
              borderRadius: "6px",
              border: "1px solid #bbf7d0",
              display: "flex",
              gap: "20px",
              fontSize: "13px",
              color: "#166534",
              flexWrap: "wrap",
            }}
          >
            <span>
              Tarifa diaria:{" "}
              <strong>Q {Number(selectedOrden.pagoUnitario).toFixed(2)}</strong>
            </span>
            <span>
              Cantidad requerida:{" "}
              <strong>{selectedOrden.cantidadRequerida}</strong>
            </span>
            <span>
              Estado: <strong>{selectedOrden.estado}</strong>
            </span>
          </div>
        )}
      </div>

      {selectedOrdenId !== null && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            {[
              {
                label: "Total registros",
                value: registros.length,
                color: "#1e293b",
              },
              {
                label: "Programados",
                value: totalProgramados,
                color: "#92400e",
              },
              {
                label: "Habilitados para pago",
                value: totalHabilitados,
                color: "#166534",
              },
              { label: "Pagados", value: totalPagados, color: "#475569" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  padding: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    margin: "0 0 6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: stat.color,
                    margin: 0,
                  }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {totalProgramados > 0 && (
            <div
              style={{
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <button
                style={{
                  ...s.btnSecondary,
                  borderColor: "#d97706",
                  color: "#92400e",
                  opacity: mutVigencia.isPending ? 0.6 : 1,
                }}
                disabled={mutVigencia.isPending}
                onClick={() => mutVigencia.mutate()}
              >
                {mutVigencia.isPending
                  ? "Actualizando..."
                  : "Activar vigencia ahora"}
              </button>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Transiciona los días programados cuya fecha ya llegó a &nbsp;
                <strong>Habilitado para pago</strong>.
              </span>
            </div>
          )}

          <div style={s.card}>
            <p style={{ ...s.subtitle, marginBottom: "12px" }}>
              Días registrados — Orden #{selectedOrden?.numeroOrden}
            </p>

            {registrosLoading ? (
              <p style={{ color: "#94a3b8", fontSize: "13px" }}>Cargando...</p>
            ) : registros.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "13px" }}>
                No hay días registrados para esta orden.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={s.previewTable}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {[
                        "Fecha",
                        "Estado",
                        "Tarifa/día",
                        "ID Asignación emp.",
                        "Planilla",
                      ].map((h) => (
                        <th key={h} style={s.previewTh}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((r: RegistroDiario) => (
                      <tr key={r.id}>
                        <td style={s.previewTd}>
                          {new Date(r.fecha).toLocaleDateString("es-GT", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td style={s.previewTd}>{estadoBadge(r.estado)}</td>
                        <td style={s.previewTd}>
                          Q {Number(r.montoDiario).toFixed(2)}
                        </td>
                        <td style={{ ...s.previewTd, color: "#64748b" }}>
                          #{r.asignacionEmpleadoId}
                        </td>
                        <td style={{ ...s.previewTd, color: "#64748b" }}>
                          {r.planillaId ? `#${r.planillaId}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p
                  style={{
                    padding: "8px 8px 0",
                    fontSize: "12px",
                    color: "#94a3b8",
                  }}
                >
                  {registros.length} registro(s)
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        open={confirmOpen}
        title="Confirmar registro de días"
        subtitle={`Orden #${selectedOrden?.numeroOrden} — del ${fechaInicio} al ${fechaFin}`}
        onClose={() => setConfirmOpen(false)}
      >
        <p style={{ fontSize: "14px", color: "#475569", margin: "0 0 8px" }}>
          Se crearán registros diarios para todos los empleados asignados a la
          cuadrilla de esta orden.
        </p>
        <ul
          style={{
            fontSize: "13px",
            color: "#64748b",
            paddingLeft: "18px",
            margin: "0 0 16px",
          }}
        >
          <li>
            Días pasados o de hoy →{" "}
            <strong style={{ color: "#166534" }}>Habilitado para pago</strong>
          </li>
          <li>
            Días futuros →{" "}
            <strong style={{ color: "#92400e" }}>Programado</strong> (se
            habilitarán cuando llegue la fecha)
          </li>
          <li>Días ya registrados serán ignorados (no se duplican).</li>
        </ul>
        <div style={s.row}>
          <button
            style={s.btnPrimary}
            disabled={mutRegistrar.isPending}
            onClick={() => mutRegistrar.mutate()}
          >
            {mutRegistrar.isPending ? "Registrando..." : "Confirmar"}
          </button>
          <button style={s.btnSecondary} onClick={() => setConfirmOpen(false)}>
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}
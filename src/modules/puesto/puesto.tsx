import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import api from "@/api";
import DataTable from "@/components/commons/DataTable";
import { s } from "@/styles/puesto.styles";
import { empty, type Puesto, type PuestoForm } from "@/types/puesto.types";
import { fetchPuestos } from "@/api/puesto.api";
import Modal from "@/components/ui/Modal";
import Stats from "@/components/commons/stats";
import { useFilter } from "@/hooks/useFilter";
import { useTooltip } from "@/hooks/useTooltip";
import { Pencil, Trash2 } from "lucide-react";
import Filters, { type Option } from "@/components/commons/filters";
import ToastContainer from "@/components/ui/Toastcontainer";
import { useToast } from "@/hooks/useToast";
import {
  puestoFormFields,
  puestoStats,
  type FormField,
} from "@/constants/puesto.constants";
import type { AxiosError } from "axios";
import { getErrorMessage } from "@/utils/api";
import { useTour } from "@/hooks/useTour";
import { useAuthStore } from "@/store/authStore";
import { PUESTO_TOUR_STEPS } from "./tour";

const ALLOWED_CHARS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s]*$/;
const ITEMS_PER_PAGE = 10;

const PUESTO_TOOLTIPS: Record<string, { title: string; description: string }> =
  {
    nombre: {
      title: "Nombre del Puesto",
      description:
        "Nombre del rol tal como aparece en las asignaciones de empleados. Debe reflejar la funcion real dentro del proceso productivo.",
    },
    descripcion: {
      title: "Descripcion del Puesto",
      description:
        "Detalle de las responsabilidades del puesto. Permite distinguir roles con nombre similar y orienta al responsable que realiza las asignaciones.",
    },
    estado: {
      title: "Estado del Puesto",
      description:
        "ACTIVO permite asignar empleados a este puesto. INACTIVO lo suspende pero conserva todas las asignaciones historicas registradas.",
    },
  };

function TipIcon({
  element,
  title,
  description,
}: {
  element: string;
  title: string;
  description: string;
}) {
  const { showTooltip } = useTooltip();
  return (
    <button
      type="button"
      onClick={() => showTooltip(element, title, description)}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0",
        color: "#94a3b8",
        fontSize: "13px",
        lineHeight: "1",
        marginLeft: "4px",
      }}
    >
      ⓘ
    </button>
  );
}

export default function Puesto() {
  const qc = useQueryClient();
  const { empleado } = useAuthStore();
  const { show, toasts, remove: removeToast } = useToast();
  const [form, setForm] = useState<PuestoForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const { startTour } = useTour(PUESTO_TOUR_STEPS, "puesto", empleado?.id);

  const puestoStorageKey =
    empleado?.id != null ? `pad_tour_puesto_v1_${empleado.id}` : null;
  const [tourDone, setTourDone] = useState(() =>
    puestoStorageKey ? localStorage.getItem(puestoStorageKey) === "1" : false,
  );
  useEffect(() => {
    if (!puestoStorageKey || tourDone) return;
    const interval = setInterval(() => {
      if (localStorage.getItem(puestoStorageKey) === "1") setTourDone(true);
    }, 500);
    return () => clearInterval(interval);
  }, [puestoStorageKey, tourDone]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["position-workers"],
    queryFn: fetchPuestos,
  });

  const { filteredData, setFilter, activeFilters, setSearch, search } =
    useFilter({
      data,
      filterableFields: ["nombre", "descripcion", "estado"],
      exactMatchFields: ["estado"],
    });

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginated = useMemo(
    () =>
      filteredData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filteredData, page],
  );

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };
  const handleFilter = (field: string, val: string) => {
    setFilter(field, val);
    setPage(1);
  };

  const stats = useMemo(() => {
    return puestoStats.map((stat) => {
      if (stat.label === "Activos") {
        return {
          ...stat,
          color: "text-[#2D6A4F]",
          value: filteredData.filter((a) => a.estado === "ACTIVO").length,
        };
      }
      if (stat.label === "Inactivos") {
        return {
          ...stat,
          color: "text-red-600",
          value: filteredData.filter((a) => a.estado === "INACTIVO").length,
        };
      }
      if (stat.label === "Total Puestos") {
        return {
          ...stat,
          color: "text-gray-900",
          value: filteredData.length,
        };
      }
      return stat;
    });
  }, [filteredData]);

  const optionsEstado: Option[] = useMemo(() => {
    const seen = new Set<string>();

    return data.reduce<Option[]>((acc, a) => {
      if (!seen.has(a.estado)) {
        seen.add(a.estado);
        acc.push({ id: a.id, nombre: a.estado });
      }
      return acc;
    }, []);
  }, [data]);

  // CORRECCIÓN: Aislamos la función para evitar interferencias de React Query
  const invalidate = (msg: string) => {
    qc.invalidateQueries({ queryKey: ["position-workers"] });
    reset();
    show(msg, "success", false);
  };

  const create = useMutation({
    mutationFn: (d: PuestoForm) => api.post("/position-workers", d),
    onSuccess: () => {
      invalidate("Puesto creado correctamente.");
    },
    onError: (error: AxiosError<unknown>) => {
      setErrorMessage(getErrorMessage(error));
    },
  });

  const update = useMutation({
    mutationFn: (d: PuestoForm) => api.put(`/position-workers/${editId}`, d),
    onSuccess: () => {
      invalidate("Puesto actualizado correctamente.");
    },
    onError: (error: AxiosError<unknown>) => {
      setErrorMessage(getErrorMessage(error));
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/position-workers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["position-workers"] });
      show("Puesto eliminado correctamente.", "success", false);
    },
    onError: (error: AxiosError<unknown>) => {
      show(getErrorMessage(error), "error");
    }
  });

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setOpen(false);
    setErrorMessage(null);
    setFieldErrors({});
  };

  const edit = (p: Puesto) => {
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      estado: p.estado,
    });
    setFieldErrors({});
    setEditId(p.id);
    setOpen(true);
  };

  const change = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (!(e.target instanceof HTMLSelectElement)) {
      setFieldErrors((p) => ({
        ...p,
        [name]:
          value && !ALLOWED_CHARS.test(value)
            ? "No se permiten caracteres especiales"
            : "",
      }));
    }
  };

  const hasErrors = Object.values(fieldErrors).some(Boolean);

  const submit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editId) {
      update.mutate(form);
    } else {
      create.mutate(form);
    }
  };

  const columns: ColumnDef<Puesto, unknown>[] = [
    { accessorKey: "nombre", header: "Nombre" },
    {
      accessorKey: "descripcion",
      header: "Descripción",
      cell: (info) => (info.getValue() as string) || "-",
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: (info) => {
        const val = info.getValue() as string;
        return (
          <span style={val === "ACTIVO" ? s.activo : s.inactivo}>{val}</span>
        );
      },
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button onClick={() => edit(row.original)} title="Editar"
            className="bg-gray-100 hover:bg-amber-100 border-0 rounded-md px-2 py-1.5 cursor-pointer transition-colors flex items-center">
            <Pencil size={13} color="#d97706" />
          </button>
          <button onClick={() => remove.mutate(row.original.id)} title="Eliminar"
            className="bg-red-50 hover:bg-red-100 border-0 rounded-md px-2 py-1.5 cursor-pointer transition-colors flex items-center">
            <Trash2 size={13} color="#dc2626" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div style={s.header}>
        <div id="puesto-title">
          <h1 style={s.title}>Puestos</h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
            Defina y gestione los puestos de trabajo disponibles en la
            organización.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button id="puesto-ayuda-btn" style={s.btnHelp} onClick={startTour}>
            ¿Necesitas ayuda?
          </button>
          <button
            id="puesto-nuevo-btn"
            style={s.btnPrimary}
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            + Nuevo
          </button>
        </div>
      </div>
      <div id="puesto-stats">
        <Stats data={stats} />
      </div>
      <div id="puesto-filtros">
        <Filters
          search={search}
          setSearch={handleSearch}
          filterValue={(activeFilters.descripcion as string) ?? ""}
          setFilterValue={(val: string) => handleFilter("descripcion", val)}
          filterEstado={(activeFilters.estado as string) ?? ""}
          setFilterEstado={(val: string) => handleFilter("estado", val)}
          placeholder="Buscar por nombre o descripción..."
          options2={optionsEstado}
          label1="Puesto"
          label2="Descripción"
        />
      </div>
      <div id="puesto-tabla" className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <DataTable
          columns={columns}
          data={paginated}
          isLoading={isLoading}
          page={page}
          totalPages={totalPages}
          totalItems={filteredData.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setPage}
          entityLabel="puestos"
        />
      </div>

      <Modal
        open={open}
        title={editId ? "Editar Puesto" : "Nuevo Puesto"}
        subtitle="Complete la información para registrar el puesto de trabajo."
        onClose={reset}
      >
        {errorMessage && (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
            }}
          >
            {errorMessage}
          </div>
        )}
        <form onSubmit={submit}>
          <div style={s.grid}>
            {puestoFormFields.map((field: FormField) => (
              <label
                key={field.name}
                style={{
                  ...s.label,
                  ...(field.fullWidth && { gridColumn: "1 / -1" }),
                }}
              >
                <span style={{ display: "flex", alignItems: "center" }}>
                  {field.label} {field.required && "*"}
                  {tourDone && PUESTO_TOOLTIPS[field.name] && (
                    <TipIcon
                      element={`#f-puesto-${field.name}`}
                      title={PUESTO_TOOLTIPS[field.name].title}
                      description={PUESTO_TOOLTIPS[field.name].description}
                    />
                  )}
                </span>
                {field.type === "select" ? (
                  <select
                    id={`f-puesto-${field.name}`}
                    name={field.name}
                    value={(form as Record<string, string>)[field.name] ?? ""}
                    onChange={change}
                    style={s.input}
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    id={`f-puesto-${field.name}`}
                    name={field.name}
                    value={(form as Record<string, string>)[field.name] ?? ""}
                    onChange={change}
                    rows={field.rows ?? 3}
                    required={field.required}
                    style={{
                      ...s.input,
                      resize: "vertical",
                      ...(fieldErrors[field.name]
                        ? {
                            border: "1px solid #ef4444",
                            outline: "2px solid #ef4444",
                            outlineOffset: "0px",
                          }
                        : {}),
                    }}
                  />
                ) : (
                  <input
                    id={`f-puesto-${field.name}`}
                    name={field.name}
                    value={(form as Record<string, string>)[field.name] ?? ""}
                    onChange={change}
                    required={field.required}
                    style={{
                      ...s.input,
                      ...(fieldErrors[field.name]
                        ? {
                            border: "1px solid #ef4444",
                            outline: "2px solid #ef4444",
                            outlineOffset: "0px",
                          }
                        : {}),
                    }}
                  />
                )}
                {fieldErrors[field.name] && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#ef4444",
                      marginTop: "2px",
                    }}
                  >
                    {fieldErrors[field.name]}
                  </span>
                )}
              </label>
            ))}
          </div>
          <div style={s.row}>
            <button
              type="submit"
              disabled={hasErrors}
              style={{
                ...s.btnPrimary,
                ...(hasErrors
                  ? {
                      background: "#94a3b8",
                      cursor: "not-allowed",
                      opacity: 0.7,
                    }
                  : {}),
              }}
            >
              Guardar
            </button>
            <button type="button" style={s.btnSecondary} onClick={reset}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import api from "@/api";
import DataTable from "@/components/commons/DataTable";
import { empty, type Area, type AreaForm } from "@/types/area.types";
import { fetchAreas } from "@/api/area.api";
import { s } from "@/styles/area.styles";
import Modal from "@/components/ui/Modal";
import Stats from "@/components/commons/stats";
import { Pencil, Trash2, Map } from "lucide-react";
import ToastContainer from "@/components/ui/Toastcontainer";
import { useToast } from "@/hooks/useToast";
import {
  areaFormFields,
  areaStats,
  type FormField,
} from "@/constants/area.constants";
import Filters, { type Option } from "@/components/commons/filters";
import { useFilter } from "@/hooks/useFilter";
import { useTooltip } from "@/hooks/useTooltip";
import type { AxiosError } from "axios";
import { getErrorMessage } from "@/utils/api";
import { useTour } from "@/hooks/useTour";
import { useAuthStore } from "@/store/authStore";
import { AREA_TOUR_STEPS } from "./tour";

const ALLOWED_CHARS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s]*$/;
const ITEMS_PER_PAGE = 10;

const AREA_TOOLTIPS: Record<string, { title: string; description: string }> = {
  nombre: {
    title: "Nombre del Area",
    description:
      "Nombre descriptivo del area de produccion. Aparece en reportes, cuadrillas y ordenes de trabajo. Conviene ser consistente con los nombres ya registrados.",
  },
  codigoArea: {
    title: "Codigo de Area",
    description:
      "Codigo corto de hasta 6 caracteres que identifica el area en listas y filtros. Ejemplo: CORTE, COST, EMPA.",
  },
  estado: {
    title: "Estado del Area",
    description:
      "ACTIVO habilita el area para recibir cuadrillas y ordenes de trabajo. INACTIVO la suspende sin eliminar el historial de asignaciones previas.",
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

export default function Area() {
  const qc = useQueryClient();
  const { empleado } = useAuthStore();
  const { show, toasts, remove: removeToast } = useToast();
  const [form, setForm] = useState<AreaForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const { startTour } = useTour(AREA_TOUR_STEPS, "area", empleado?.id);

  const areaStorageKey =
    empleado?.id != null ? `pad_tour_area_v1_${empleado.id}` : null;
  const [tourDone, setTourDone] = useState(() =>
    areaStorageKey ? localStorage.getItem(areaStorageKey) === "1" : false,
  );
  useEffect(() => {
    if (!areaStorageKey || tourDone) return;
    const interval = setInterval(() => {
      if (localStorage.getItem(areaStorageKey) === "1") setTourDone(true);
    }, 500);
    return () => clearInterval(interval);
  }, [areaStorageKey, tourDone]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["area"],
    queryFn: fetchAreas,
  });

  const { filteredData, setFilter, activeFilters, setSearch, search } =
    useFilter({
      data,
      filterableFields: ["nombre", "codigoArea", "estado"],
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
    return areaStats.map((stat) => {
      if (stat.label === "Activas") {
        return {
          ...stat,
          color: "text-[#2D6A4F]",
          value: filteredData.filter((a) => a.estado === "ACTIVO").length,
        };
      }
      if (stat.label === "Inactivas") {
        return {
          ...stat,
          color: "text-red-600",
          value: filteredData.filter((a) => a.estado === "INACTIVO").length,
        };
      }
      if (stat.label === "Total Áreas") {
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

  const invalidate = (msg: string) => { 
    qc.invalidateQueries({ queryKey: ["area"] }); 
    reset(); 
    show(msg, "success", false); 
  };

  const create = useMutation({
    mutationFn: (d: AreaForm) => api.post("/area", d),
    onSuccess: () => {
      invalidate("Área creada correctamente.");
    },
    onError: (error: AxiosError<unknown>) => {
      setErrorMessage(getErrorMessage(error));
    },
  });

  const update = useMutation({
    mutationFn: (d: AreaForm) => api.put(`/area/${editId}`, d),
    onSuccess: () => {
      invalidate("Área actualizada correctamente.");
    },
    onError: (error: AxiosError<unknown>) => {
      setErrorMessage(getErrorMessage(error));
    },
  });
  
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/area/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["area"] });
      show("Área Openizada correctamente.", "success", false);
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

  const edit = (a: Area) => {
    setForm({
      nombre: a.nombre,
      codigoArea: a.codigoArea ?? "",
      estado: a.estado,
    });
    setFieldErrors({});
    setEditId(a.id);
    setOpen(true);
  };

  const change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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

  const columns: ColumnDef<Area, unknown>[] = [
    {
      accessorKey: "codigoArea",
      header: "Código",
      cell: (info) => (info.getValue() as string) ?? "-",
    },
    { accessorKey: "nombre", header: "Nombre" },
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
        <div id="area-title" className="flex items-center gap-3">
          <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Map size={22} color="#2D6A4F" />
          </div>
          <div>
            <h1 style={{ ...s.title, margin: 0 }}>Áreas</h1>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
              Organice y gestione las áreas de producción y su estado operativo.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button id="area-ayuda-btn" style={s.btnHelp} onClick={startTour}>
            ¿Necesitas ayuda?
          </button>
          <button
            id="area-nuevo-btn"
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
      <div id="area-stats">
        <Stats data={stats} />
      </div>
      <div id="area-filtros">
        <Filters
          search={search}
          setSearch={handleSearch}
          filterValue={(activeFilters.codigoArea as string) ?? ""}
          setFilterValue={(val: string) => handleFilter("codigoArea", val)}
          filterEstado={(activeFilters.estado as string) ?? ""}
          setFilterEstado={(val: string) => handleFilter("estado", val)}
          options2={optionsEstado}
          placeholder="Buscar por nombre o código..."
          label1="Área"
          label2="Estado"
        />
      </div>
      <div id="area-tabla" className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <DataTable
          columns={columns}
          data={paginated}
          isLoading={isLoading}
          page={page}
          totalPages={totalPages}
          totalItems={filteredData.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setPage}
          entityLabel="áreas"
        />
      </div>
      <Modal
        open={open}
        title={editId ? "Editar Área" : "Nuevo Área"}
        subtitle="Complete la información para registrar el área."
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
            {areaFormFields.map((field: FormField) => (
              <label key={field.name} style={s.label}>
                <span style={{ display: "flex", alignItems: "center" }}>
                  {field.label} {field.required && "*"}
                  {tourDone && AREA_TOOLTIPS[field.name] && (
                    <TipIcon
                      element={`#f-area-${field.name}`}
                      title={AREA_TOOLTIPS[field.name].title}
                      description={AREA_TOOLTIPS[field.name].description}
                    />
                  )}
                </span>
                {field.type === "select" ? (
                  <select
                    id={`f-area-${field.name}`}
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
                ) : (
                  <input
                    id={`f-area-${field.name}`}
                    name={field.name}
                    value={(form as Record<string, string>)[field.name] ?? ""}
                    onChange={change}
                    required={field.required}
                    maxLength={field.maxLength}
                    style={{
                      ...s.input,
                      ...(fieldErrors[field.name]
                        ? {
                            border: "0.1px solid #ef4444",
                            outline: "0.1px solid #ef4444",
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
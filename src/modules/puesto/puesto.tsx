import { useMemo, useState } from "react";
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
import Filters, { type Option } from "@/components/commons/filters";
import {
  puestoFormFields,
  puestoStats,
  type FormField,
} from "@/constants/puesto.constants";
import type { AxiosError } from "node_modules/axios/index.d.cts";
import { getErrorMessage } from "@/utils/api";

export default function Puesto() {
  const qc = useQueryClient();
  const [form, setForm] = useState<PuestoForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["position-workers"] });
    reset();
  };

  const create = useMutation({
    mutationFn: (d: PuestoForm) => api.post("/position-workers", d),
    onSuccess: invalidate,
    onError: (error: AxiosError<unknown>) => {
      setErrorMessage(getErrorMessage(error));
    },
  });

  const update = useMutation({
    mutationFn: (d: PuestoForm) => api.put(`/position-workers/${editId}`, d),
    onSuccess: invalidate,
    onError: (error: AxiosError<unknown>) => {
      setErrorMessage(getErrorMessage(error));
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/position-workers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["position-workers"] }),
  });

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setOpen(false);
    setErrorMessage(null);
  };

  const edit = (p: Puesto) => {
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      estado: p.estado,
    });
    setEditId(p.id);
    setOpen(true);
  };

  const change = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

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
        <>
          <button style={s.btnIcon} onClick={() => edit(row.original)}>
            ✏️
          </button>
          <button
            style={s.btnIcon}
            onClick={() => remove.mutate(row.original.id)}
          >
            🗑️
          </button>
        </>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Puestos</h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
            Defina y gestione los puestos de trabajo disponibles en la
            organización.
          </p>
        </div>
        <button
          style={s.btnPrimary}
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          + Nuevo
        </button>
      </div>
      <Stats data={stats} />
      <Filters
        search={search}
        setSearch={setSearch}
        filterValue={(activeFilters.descripcion as string) ?? ""}
        setFilterValue={(val: string) => setFilter("descripcion", val)}
        filterEstado={(activeFilters.estado as string) ?? ""}
        setFilterEstado={(val: string) => setFilter("estado", val)}
        placeholder="Buscar por nombre o descripción..."
        options2={optionsEstado}
        label1="Puesto"
        label2="Descripción"
      />
      <div style={s.card}>
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
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
                {field.label} {field.required && "*"}
                {field.type === "select" ? (
                  <select
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
                    name={field.name}
                    value={(form as Record<string, string>)[field.name] ?? ""}
                    onChange={change}
                    rows={field.rows ?? 3}
                    required={field.required}
                    style={{ ...s.input, resize: "vertical" }}
                  />
                ) : (
                  <input
                    name={field.name}
                    value={(form as Record<string, string>)[field.name] ?? ""}
                    onChange={change}
                    required={field.required}
                    style={s.input}
                  />
                )}
              </label>
            ))}
          </div>
          <div style={s.row}>
            <button type="submit" style={s.btnPrimary}>
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

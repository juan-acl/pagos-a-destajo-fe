import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import api from "@/api";
import DataTable from "@/components/commons/DataTable";
import { empty, type Area, type AreaForm } from "@/types/area.types";
import { fetchAreas } from "@/api/area.api";
import { s } from "@/styles/area.styles";
import Modal from "@/components/ui/Modal";
import Stats from "@/components/commons/stats";
import {
  areaFormFields,
  areaStats,
  type FormField,
} from "@/constants/area.constants";
import Filters, { type Option } from "@/components/commons/filters";
import { useFilter } from "@/hooks/useFilter";

export default function Area() {
  const qc = useQueryClient();
  const [form, setForm] = useState<AreaForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["area"] });
    reset();
  };
  const create = useMutation({
    mutationFn: (d: AreaForm) => api.post("/area", d),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (d: AreaForm) => api.put(`/area/${editId}`, d),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/area/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["area"] }),
  });

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setOpen(false);
  };

  const edit = (a: Area) => {
    setForm({
      nombre: a.nombre,
      codigoArea: a.codigoArea ?? "",
      estado: a.estado,
    });
    setEditId(a.id);
    setOpen(true);
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

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
          <h1 style={s.title}>Áreas</h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748b" }}>
            Organice y gestione las áreas de producción y su estado operativo.
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
        filterValue={(activeFilters.codigoArea as string) ?? ""}
        setFilterValue={(val: string) => setFilter("codigoArea", val)}
        filterEstado={(activeFilters.estado as string) ?? ""}
        setFilterEstado={(val: string) => setFilter("estado", val)}
        options2={optionsEstado}
        placeholder="Buscar por nombre o código..."
        label1="Área"
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
        open={open}
        title={editId ? "Editar Área" : "Nuevo Área"}
        subtitle="Complete la información para registrar el área."
        onClose={reset}
      >
        <form onSubmit={submit}>
          <div style={s.grid}>
            {areaFormFields.map((field: FormField) => (
              <label key={field.name} style={s.label}>
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

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import AppShell from "@/components/layout/AppShell";
import { crudStyles as s } from "@/styles/crudStyles";
import { getErrorMessage, type ApiEnvelope } from "@/utils/api";

type EmployeeAssignment = {
  id: number;
  metaIndividual: number;
  estado: string;
  cuadrillaId: number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
};

type Cuadrilla = {
  id: number;
  nombre: string;
  codigoCuadrilla?: string | null;
  areaId?: number | null;
  estado: string;
};

type EmployeeAssignmentForm = {
  metaIndividual: number | "";
  estado: string;
  cuadrillaId: number | "";
};

const empty: EmployeeAssignmentForm = {
  metaIndividual: "",
  estado: "ACTIVO",
  cuadrillaId: "",
};

const fetchAssignments = () =>
  api
    .get<ApiEnvelope<EmployeeAssignment[]>>("/employee-assignment")
    .then((response) => response.data.data);

const fetchCuadrillas = () =>
  api
    .get<ApiEnvelope<Cuadrilla[]>>("/cuadrillas")
    .then((response) => response.data.data);

export default function EmployeeAssignmentPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<EmployeeAssignmentForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["employee-assignment"],
    queryFn: fetchAssignments,
  });

  const { data: cuadrillas = [], isLoading: loadingCuadrillas } = useQuery({
    queryKey: ["cuadrillas"],
    queryFn: fetchCuadrillas,
  });

  const cuadrillasDisponibles = useMemo(
    () => cuadrillas.filter((item) => item.estado === "ACTIVO"),
    [cuadrillas]
  );

  const getCuadrillaLabel = (cuadrillaId: number) => {
    const cuadrilla = cuadrillas.find((item) => item.id === cuadrillaId);
    if (!cuadrilla) return `ID ${cuadrillaId}`;

    return cuadrilla.codigoCuadrilla
      ? `${cuadrilla.nombre} (${cuadrilla.codigoCuadrilla})`
      : cuadrilla.nombre;
  };

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setOpen(false);
    setMessage(null);
  };

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["employee-assignment"] });
    reset();
  };

  const create = useMutation({
    mutationFn: (payload: EmployeeAssignmentForm) =>
      api.post("/employee-assignment", {
        metaIndividual: Number(payload.metaIndividual),
        estado: payload.estado,
        cuadrillaId: Number(payload.cuadrillaId),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const update = useMutation({
    mutationFn: (payload: EmployeeAssignmentForm) =>
      api.put(`/employee-assignment/${editId}`, {
        metaIndividual: Number(payload.metaIndividual),
        estado: payload.estado,
        cuadrillaId: Number(payload.cuadrillaId),
      }),
    onSuccess: invalidate,
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/employee-assignment/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["employee-assignment"] });
      setMessage(null);
    },
    onError: (error) => setMessage(getErrorMessage(error)),
  });

  const edit = (item: EmployeeAssignment) => {
    setForm({
      metaIndividual: item.metaIndividual,
      estado: item.estado,
      cuadrillaId: item.cuadrillaId,
    });
    setEditId(item.id);
    setOpen(true);
    setMessage(null);
  };

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "metaIndividual" || name === "cuadrillaId"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (form.cuadrillaId === "") {
      setMessage("Debes seleccionar una cuadrilla.");
      return;
    }

    if (editId) {
      update.mutate(form);
      return;
    }

    create.mutate(form);
  };

  return (
    <AppShell>
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.titleGroup}>
            <h1 style={s.title}>Asignación de empleado</h1>
  
          </div>
          <button
            style={s.btnPrimary}
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            + Nueva asignación
          </button>
        </div>

        {message && <div style={s.error}>{message}</div>}

        {open && (
          <div style={s.card}>
            <h2 style={s.subtitle}>{editId ? "Editar" : "Nueva"} asignación</h2>

            <form onSubmit={submit}>
              <div style={s.grid}>
                <label style={s.label}>
                  Meta individual *
                  <input
                    name="metaIndividual"
                    type="number"
                    value={form.metaIndividual}
                    onChange={change}
                    required
                    style={s.input}
                  />
                </label>

                <label style={s.label}>
                  Cuadrilla *
                  <select
                    name="cuadrillaId"
                    value={form.cuadrillaId}
                    onChange={change}
                    required
                    style={s.input}
                    disabled={loadingCuadrillas}
                  >
                    <option value="">
                      {loadingCuadrillas ? "Cargando cuadrillas..." : "Selecciona una cuadrilla"}
                    </option>
                    {cuadrillasDisponibles.map((cuadrilla) => (
                      <option key={cuadrilla.id} value={cuadrilla.id}>
                        {cuadrilla.codigoCuadrilla
                          ? `${cuadrilla.nombre} - ${cuadrilla.codigoCuadrilla} (ID ${cuadrilla.id})`
                          : `${cuadrilla.nombre} (ID ${cuadrilla.id})`}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={s.label}>
                  Estado
                  <select name="estado" value={form.estado} onChange={change} style={s.input}>
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </label>
              </div>

              <div style={s.row}>
                <button type="submit" style={s.btnPrimary}>
                  {create.isPending || update.isPending ? "Guardando..." : "Guardar"}
                </button>
                <button type="button" style={s.btnSecondary} onClick={reset}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={s.card}>
          <div style={s.tableWrap}>
            {isLoading ? (
              <p style={s.empty}>Cargando...</p>
            ) : assignments.length === 0 ? (
              <p style={s.empty}>Sin registros</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {["ID", "Meta individual", "Cuadrilla", "Estado", "Acciones"].map((h) => (
                      <th key={h} style={s.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((item) => (
                    <tr key={item.id} style={s.tr}>
                      <td style={s.td}>{item.id}</td>
                      <td style={s.td}>{item.metaIndividual}</td>
                      <td style={s.td}>{getCuadrillaLabel(item.cuadrillaId)}</td>
                      <td style={s.td}>
                        <span style={item.estado === "ACTIVO" ? s.activo : s.inactivo}>
                          {item.estado}
                        </span>
                      </td>
                      <td style={{ ...s.td, ...s.actionCell }}>
                        <button style={s.btnEdit} onClick={() => edit(item)}>
                          Editar
                        </button>
                        <button style={s.btnDelete} onClick={() => remove.mutate(item.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import AppShell from "@/components/layout/AppShell";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";

type Empleado = { 
  id: number; 
  codigoEmpleado: string | null; 
  primerNombre: string; 
  primerApellido: string;
  estado: string;
};
type Cuadrilla = { id: number; nombre: string; codigoCuadrilla: string | null; };
type MiembroCuadrilla = {
  id: number;
  empleadoId: number;
  cuadrillaId: number;
  empleado?: { codigoEmpleado: string | null; primerNombre: string; primerApellido: string; };
  cuadrilla?: { nombre: string; };
  fechaIngreso?: string | null;
  estado: string;
};
type MiembroForm = {
  empleadoId: number;
  cuadrillaId: number;
  fechaIngreso: string;
  estado: string;
};

const empty: MiembroForm = { empleadoId: 0, cuadrillaId: 0, fechaIngreso: "", estado: "ACTIVO" };

const fetchMiembros = () => api.get<{ data: MiembroCuadrilla[] }>("/miembros-cuadrilla").then(r => r.data.data);
const fetchEmpleados = () => api.get<{ data: Empleado[] }>("/empleados").then(r => r.data.data);
const fetchCuadrillas = () => api.get<{ data: Cuadrilla[] }>("/cuadrillas").then(r => r.data.data);

export default function MiembroCuadrillaModule() {
  const qc = useQueryClient();
  const [form, setForm] = useState<MiembroForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCuadrilla, setFilterCuadrilla] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  const { data = [], isLoading } = useQuery({ queryKey: ["miembros-cuadrilla"], queryFn: fetchMiembros });
  const { data: empleados = [] } = useQuery({ queryKey: ["empleados"], queryFn: fetchEmpleados });
  const { data: cuadrillas = [] } = useQuery({ queryKey: ["cuadrillas"], queryFn: fetchCuadrillas });

  const filtered = useMemo(() => data.filter(m => {
    const nombre = `${m.empleado?.primerNombre ?? ""} ${m.empleado?.primerApellido ?? ""} ${m.empleado?.codigoEmpleado ?? ""}`.toLowerCase();
    const matchSearch = !search || nombre.includes(search.toLowerCase());
    const matchCuadrilla = !filterCuadrilla || String(m.cuadrillaId) === filterCuadrilla;
    const matchEstado = !filterEstado || m.estado === filterEstado;
    return matchSearch && matchCuadrilla && matchEstado;
  }), [data, search, filterCuadrilla, filterEstado]);

  const activos = data.filter(m => m.estado === "ACTIVO").length;
  const inactivos = data.filter(m => m.estado === "INACTIVO").length;

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["miembros-cuadrilla"] }); reset(); };
  const create = useMutation({ mutationFn: (d: MiembroForm) => api.post("/miembros-cuadrilla", d), onSuccess: invalidate });
  const update = useMutation({ mutationFn: (d: MiembroForm) => api.put(`/miembros-cuadrilla/${editId}`, d), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/miembros-cuadrilla/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["miembros-cuadrilla"] }) });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); };
  const edit = (m: MiembroCuadrilla) => {
    setForm({
      empleadoId: m.empleadoId,
      cuadrillaId: m.cuadrillaId,
      fechaIngreso: m.fechaIngreso ?? "",
      estado: m.estado,
    });
    setEditId(m.id); setOpen(true);
  };
  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({
      ...p,
      [name]: name === "empleadoId" || name === "cuadrillaId" ? Number(value) : value,
    }));
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };

  const formatFecha = (fecha: string | null | undefined) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <AppShell>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "#1A202C" }}>Miembros de Cuadrilla</h1>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B7280" }}>
              Gestione la asignación de empleados a cuadrillas de trabajo.
            </p>
          </div>
          <button onClick={() => { reset(); setOpen(true); }} style={s.btnPrimary}>
            + Nuevo Miembro
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div style={s.stat}>
            <div style={s.statLabel}>Total Miembros</div>
            <div style={{ ...s.statValue, color: "#1A202C" }}>{data.length}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Activos</div>
            <div style={{ ...s.statValue, color: "#2D6A4F" }}>{activos}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Inactivos</div>
            <div style={{ ...s.statValue, color: "#DC3545" }}>{inactivos}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Cuadrillas</div>
            <div style={{ ...s.statValue, color: "#1A202C" }}>{cuadrillas.filter(c => c.nombre).length}</div>
          </div>
        </div>

        {/* Filtros */}
        <div style={s.filterBar}>
          <input
            placeholder="Buscar por empleado o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...s.input, flex: 1, minWidth: "200px" }}
          />
          <select value={filterCuadrilla} onChange={e => setFilterCuadrilla(e.target.value)} style={s.input}>
            <option value="">Cuadrilla: Todas</option>
            {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={s.input}>
            <option value="">Estado: Todos</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>

        {/* Tabla */}
        <div style={s.tableWrap}>
          {isLoading ? (
            <p style={s.empty}>Cargando...</p>
          ) : filtered.length === 0 ? (
            <p style={s.empty}>Sin resultados</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#F8F9FA" }}>
                  {["Empleado", "Cuadrilla", "Fecha Ingreso", "Estado", "Acciones"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id} style={{ borderTop: "1px solid #E2E8F0", background: i % 2 === 0 ? "#fff" : "#F8F9FA" }}>
                    <td style={s.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "36px", height: "36px", borderRadius: "50%",
                          background: "#2D6A4F", color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "13px", fontWeight: 700, flexShrink: 0,
                        }}>
                          {m.empleado ? `${m.empleado.primerNombre[0]}${m.empleado.primerApellido[0]}` : "?"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#1A202C" }}>
                            {m.empleado ? `${m.empleado.primerNombre} ${m.empleado.primerApellido}` : `ID: ${m.empleadoId}`}
                          </div>
                          <div style={{ fontSize: "12px", color: "#9CA3AF", fontFamily: "monospace" }}>
                            {m.empleado?.codigoEmpleado ?? "-"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>
                      {m.cuadrilla
                        ? <Badge label={m.cuadrilla.nombre} color="amber" />
                        : <span style={{ color: "#9CA3AF", fontSize: "12px" }}>ID: {m.cuadrillaId}</span>
                      }
                    </td>
                    <td style={s.td}>
                      <span style={{ fontSize: "13px", color: "#6B7280" }}>{formatFecha(m.fechaIngreso)}</span>
                    </td>
                    <td style={s.td}>
                      <Badge label={m.estado} color={m.estado === "ACTIVO" ? "green" : "gray"} />
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => edit(m)} style={s.btnIcon} title="Editar">✏️</button>
                        <button onClick={() => remove.mutate(m.id)} style={{ ...s.btnIcon, background: "#FFF0F0" }} title="Eliminar">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filtered.length > 0 && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid #E2E8F0", fontSize: "13px", color: "#9CA3AF" }}>
              Mostrando {filtered.length} de {data.length} miembros
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={open}
        title={editId ? "Editar Miembro" : "Nuevo Miembro de Cuadrilla"}
        subtitle="Asigne un empleado a una cuadrilla de trabajo."
        onClose={reset}
      >
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <label style={s.label}>
              Empleado *
              <select name="empleadoId" value={form.empleadoId || ""} onChange={change} required style={s.inputModal}>
                <option value="">Seleccione empleado...</option>
                {empleados.filter(e => e.estado !== "INACTIVO").map(e => (
                  <option key={e.id} value={e.id}>
                    {e.codigoEmpleado} - {e.primerNombre} {e.primerApellido}
                  </option>
                ))}
              </select>
            </label>
            <label style={s.label}>
              Cuadrilla *
              <select name="cuadrillaId" value={form.cuadrillaId || ""} onChange={change} required style={s.inputModal}>
                <option value="">Seleccione cuadrilla...</option>
                {cuadrillas.filter(c => c.nombre).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
            <label style={s.label}>
              Fecha de Ingreso
              <input name="fechaIngreso" type="date" value={form.fechaIngreso} onChange={change} style={s.inputModal} />
            </label>
            <label style={s.label}>
              Estado
              <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                {["ACTIVO", "INACTIVO"].map(est => (
                  <label key={est} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 400, textTransform: "none" as const, letterSpacing: 0 }}>
                    <input type="radio" name="estado" value={est} checked={form.estado === est} onChange={change} />
                    {est.charAt(0) + est.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #E2E8F0" }}>
            <button type="button" onClick={reset} style={s.btnSecondary}>Cancelar</button>
            <button type="submit" style={s.btnPrimary} disabled={create.isPending || update.isPending}>
              {editId ? "Actualizar" : "Guardar Miembro"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

const s: Record<string, React.CSSProperties> = {
  btnPrimary:   { background: "#2D6A4F", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", cursor: "pointer", fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap" },
  btnSecondary: { background: "#fff", color: "#1A202C", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 20px", cursor: "pointer", fontSize: "14px" },
  btnIcon:      { background: "#F8F9FA", border: "none", borderRadius: "6px", padding: "6px 8px", cursor: "pointer", fontSize: "14px" },
  input:        { border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", background: "#fff", color: "#1A202C", outline: "none" },
  inputModal:   { border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", background: "#fff", color: "#1A202C", outline: "none", width: "100%", boxSizing: "border-box" as const },
  label:        { display: "flex", flexDirection: "column" as const, gap: "6px", fontSize: "12px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
  th:           { padding: "12px 16px", textAlign: "left" as const, fontSize: "12px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.5px", borderBottom: "1px solid #E2E8F0" },
  td:           { padding: "12px 16px", verticalAlign: "middle" as const },
  empty:        { textAlign: "center" as const, padding: "48px", color: "#9CA3AF" },
  filterBar:    { background: "#fff", borderRadius: "10px", padding: "14px 16px", border: "1px solid #E2E8F0", marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap" as const },
  tableWrap:    { background: "#fff", borderRadius: "10px", border: "1px solid #E2E8F0", overflow: "hidden" },
  stat:         { background: "#fff", borderRadius: "10px", padding: "20px 24px", border: "1px solid #E2E8F0", flex: 1, minWidth: "140px" },
  statLabel:    { fontSize: "12px", color: "#6B7280", fontWeight: 500, marginBottom: "8px", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
  statValue:    { fontSize: "28px", fontWeight: 700 },
};
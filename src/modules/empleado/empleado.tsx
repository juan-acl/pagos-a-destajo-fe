import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import AppShell from "@/components/layout/AppShell";
import Badge from "@/components/ui/badge";
import StatsCard from "@/components/ui/StatsCard";
import Modal from "@/components/ui/Modal";

type Puesto = { id: number; nombre: string; };
type Empleado = {
  id: number;
  primerNombre: string;
  segundoNombre?: string | null;
  primerApellido: string;
  segundoApellido?: string | null;
  email: string;
  codigoEmpleado?: string | null;
  pstPuesto?: number | null;
  estado: string;
};
type EmpleadoForm = Omit<Empleado, "id"> & { password: string };

const empty: EmpleadoForm = {
  primerNombre: "", segundoNombre: "", primerApellido: "", segundoApellido: "",
  email: "", password: "", codigoEmpleado: "", pstPuesto: null, estado: "ACTIVO",
};

const fetchEmpleados = () => api.get<{ data: Empleado[] }>("/empleados").then(r => r.data.data);
const fetchPuestos = () => api.get<{ data: Puesto[] }>("/position-workers").then(r => r.data.data);

export default function EmpleadoModule() {
  const qc = useQueryClient();
  const [form, setForm] = useState<EmpleadoForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPuesto, setFilterPuesto] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  const { data = [], isLoading } = useQuery({ queryKey: ["empleados"], queryFn: fetchEmpleados });
  const { data: puestos = [] } = useQuery({ queryKey: ["puestos"], queryFn: fetchPuestos });

  const filtered = useMemo(() => data.filter(e => {
    const nombre = `${e.primerNombre} ${e.primerApellido} ${e.codigoEmpleado ?? ""}`.toLowerCase();
    const matchSearch = !search || nombre.includes(search.toLowerCase());
    const matchPuesto = !filterPuesto || String(e.pstPuesto) === filterPuesto;
    const matchEstado = !filterEstado || e.estado === filterEstado;
    return matchSearch && matchPuesto && matchEstado;
  }), [data, search, filterPuesto, filterEstado]);

const activos = data.filter(e => e.estado === "ACTIVO").length;
const inactivos = data.filter(e => e.estado === "INACTIVO").length;

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["empleados"] }); reset(); };
  const create = useMutation({ mutationFn: (d: EmpleadoForm) => api.post("/empleados", d), onSuccess: invalidate });
  const update = useMutation({ mutationFn: (d: EmpleadoForm) => api.put(`/empleados/${editId}`, d), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/empleados/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["empleados"] }) });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); };
  const edit = (e: Empleado) => {
    setForm({ ...e, password: "", segundoNombre: e.segundoNombre ?? "", segundoApellido: e.segundoApellido ?? "", codigoEmpleado: e.codigoEmpleado ?? "" });
    setEditId(e.id); setOpen(true);
  };
  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: name === "pstPuesto" ? (value ? Number(value) : null) : value }));
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };
  const getNombrePuesto = (id: number | null | undefined) => puestos.find(p => p.id === id)?.nombre ?? null;

  const stat: React.CSSProperties = {
  background: "#fff",
  borderRadius: "10px",
  padding: "20px 24px",
  border: "1px solid #E2E8F0",
  flex: 1,
};


  return (
    <AppShell>
      <div style={{ padding: "28px 32px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "var(--text-primary)" }}>Empleados</h1>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>
              Gestione la fuerza laboral, asigne roles y supervise el estado operativo de su equipo.
            </p>
          </div>
          <button onClick={() => { reset(); setOpen(true); }} style={s.btnPrimary}>
            + Nuevo Empleado
          </button>
        </div>

    {/* Stats */}
    <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
      <div style={stat}>
        <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Plantilla</div>
        <div style={{ fontSize: "28px", fontWeight: 700, color: "#1A202C" }}>{data.length}</div>
      </div>
      <div style={stat}>
        <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Activos Ahora</div>
        <div style={{ fontSize: "28px", fontWeight: 700, color: "#2D6A4F" }}>{activos}</div>
      </div>
      <div style={stat}>
        <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Inactivos</div>
        <div style={{ fontSize: "28px", fontWeight: 700, color: "#DC3545" }}>{inactivos}</div>
      </div>
    </div>

        {/* Filtros */}
        <div style={{ background: "var(--white)", borderRadius: "var(--radius-md)", padding: "16px 20px", boxShadow: "var(--shadow-sm)", border: "1px solid var(--neutral-dark)", marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <input
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...s.input, flex: 1, minWidth: "200px" }}
          />
          <select value={filterPuesto} onChange={e => setFilterPuesto(e.target.value)} style={s.input}>
            <option value="">Puesto: Todos</option>
            {puestos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={s.input}>
            <option value="">Estado: Todos</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>

        {/* Tabla */}
        <div style={{ background: "var(--white)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--neutral-dark)", overflow: "hidden" }}>
          {isLoading ? (
            <p style={s.empty}>Cargando...</p>
          ) : filtered.length === 0 ? (
            <p style={s.empty}>Sin resultados</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "var(--neutral)" }}>
                  {["Código", "Empleado", "Puesto", "Email", "Estado", "Acciones"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e.id} style={{ borderTop: "1px solid var(--neutral-dark)", background: i % 2 === 0 ? "var(--white)" : "var(--neutral)" }}>
                    <td style={s.td}>
                      <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
                        {e.codigoEmpleado ?? "-"}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "36px", height: "36px", borderRadius: "50%",
                          background: "var(--primary)", color: "var(--white)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "13px", fontWeight: 700, flexShrink: 0,
                        }}>
                          {e.primerNombre[0]}{e.primerApellido[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {e.primerNombre} {e.segundoNombre ?? ""} {e.primerApellido} {e.segundoApellido ?? ""}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>
                      {getNombrePuesto(e.pstPuesto)
                        ? <Badge label={getNombrePuesto(e.pstPuesto)!} color="green" />
                        : <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Sin puesto</span>
                      }
                    </td>
                    <td style={s.td}><span style={{ color: "var(--text-secondary)" }}>{e.email}</span></td>
                    <td style={s.td}>
                      <Badge label={e.estado} color={e.estado === "ACTIVO" ? "green" : "gray"} />
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => edit(e)} style={s.btnIcon} title="Editar">✏️</button>
                        <button onClick={() => remove.mutate(e.id)} style={{ ...s.btnIcon, background: "var(--danger-light)" }} title="Eliminar">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filtered.length > 0 && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--neutral-dark)", fontSize: "13px", color: "var(--text-muted)" }}>
              Mostrando {filtered.length} de {data.length} empleados
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={open}
        title={editId ? "Editar Empleado" : "Registro de Empleado"}
        subtitle="Complete la información para integrar al nuevo miembro del equipo."
        onClose={reset}
      >
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <label style={s.label}>
              Código de Empleado
              <input name="codigoEmpleado" placeholder="EMP-2024-" value={form.codigoEmpleado ?? ""} onChange={change} style={s.input} />
            </label>
            <label style={s.label}>
              Primer Apellido *
              <input name="primerApellido" placeholder="Ej. García" value={form.primerApellido} onChange={change} required style={s.input} />
            </label>
            <label style={s.label}>
              Primer Nombre *
              <input name="primerNombre" placeholder="Ej. Roberto" value={form.primerNombre} onChange={change} required style={s.input} />
            </label>
            <label style={s.label}>
              Segundo Apellido
              <input name="segundoApellido" placeholder="Ej. Méndez" value={form.segundoApellido ?? ""} onChange={change} style={s.input} />
            </label>
            <label style={s.label}>
              Segundo Nombre
              <input name="segundoNombre" placeholder="Ej. Antonio" value={form.segundoNombre ?? ""} onChange={change} style={s.input} />
            </label>
            <label style={s.label}>
              Correo Electrónico *
              <input name="email" type="email" placeholder="nombre@tpm-agri.com" value={form.email} onChange={change} required style={s.input} />
            </label>
            <label style={s.label}>
              {editId ? "Nueva Contraseña (opcional)" : "Contraseña Temporal *"}
              <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={change} required={!editId} style={s.input} />
            </label>
            <label style={s.label}>
              Puesto Asignado
              <select name="pstPuesto" value={form.pstPuesto ?? ""} onChange={change} style={s.input}>
                <option value="">Seleccione puesto...</option>
                {puestos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
            <label style={s.label}>
              Estado Inicial
              <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                {["ACTIVO", "INACTIVO"].map(est => (
                  <label key={est} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                    <input type="radio" name="estado" value={est} checked={form.estado === est} onChange={change} />
                    {est.charAt(0) + est.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--neutral-dark)" }}>
            <button type="button" onClick={reset} style={s.btnSecondary}>Cancelar</button>
            <button type="submit" style={s.btnPrimary} disabled={create.isPending || update.isPending}>
              {editId ? "Actualizar Empleado" : "Guardar Empleado"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

const s: Record<string, React.CSSProperties> = {
  btnPrimary:   { background: "var(--primary)", color: "var(--white)", border: "none", borderRadius: "var(--radius-sm)", padding: "10px 20px", cursor: "pointer", fontSize: "14px", fontWeight: 600 },
  btnSecondary: { background: "var(--white)", color: "var(--text-primary)", border: "1px solid var(--neutral-dark)", borderRadius: "var(--radius-sm)", padding: "10px 20px", cursor: "pointer", fontSize: "14px" },
  btnIcon:      { background: "var(--neutral)", border: "none", borderRadius: "var(--radius-sm)", padding: "6px 8px", cursor: "pointer", fontSize: "14px" },
  input:        { border: "1px solid var(--neutral-dark)", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: "14px", width: "100%", boxSizing: "border-box" as const, outline: "none", color: "var(--text-primary)" },
  label:        { display: "flex", flexDirection: "column" as const, gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
  th:           { padding: "12px 16px", textAlign: "left" as const, fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
  td:           { padding: "12px 16px" },
  empty:        { textAlign: "center" as const, padding: "48px", color: "var(--text-muted)" },
  
};
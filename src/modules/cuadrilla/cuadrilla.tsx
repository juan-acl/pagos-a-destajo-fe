import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import AppShell from "@/components/layout/AppShell";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";

type Area = { id: number; nombre: string; };
type Cuadrilla = {
  id: number;
  nombre: string;
  codigoCuadrilla?: string | null;
  areaId?: number | null;
  estado: string;
};
type CuadrillaForm = Omit<Cuadrilla, "id">;

const empty: CuadrillaForm = { nombre: "", codigoCuadrilla: "", areaId: null, estado: "ACTIVO" };

const fetchCuadrillas = () => api.get<{ data: Cuadrilla[] }>("/cuadrillas").then(r => r.data.data);
const fetchAreas = () => api.get<{ data: Area[] }>("/area").then(r => r.data.data);

export default function CuadrillaModule() {
  const qc = useQueryClient();
  const [form, setForm] = useState<CuadrillaForm>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  const { data = [], isLoading } = useQuery({ queryKey: ["cuadrillas"], queryFn: fetchCuadrillas });
  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: fetchAreas });

  const filtered = useMemo(() => data.filter(c => {
    const texto = `${c.nombre} ${c.codigoCuadrilla ?? ""}`.toLowerCase();
    const matchSearch = !search || texto.includes(search.toLowerCase());
    const matchEstado = !filterEstado || c.estado === filterEstado;
    return matchSearch && matchEstado;
  }), [data, search, filterEstado]);

  const activas = data.filter(c => c.estado === "ACTIVO").length;
  const inactivas = data.filter(c => c.estado === "INACTIVO").length;

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["cuadrillas"] }); reset(); };
  const create = useMutation({ mutationFn: (d: CuadrillaForm) => api.post("/cuadrillas", d), onSuccess: invalidate });
  const update = useMutation({ mutationFn: (d: CuadrillaForm) => api.put(`/cuadrillas/${editId}`, d), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/cuadrillas/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["cuadrillas"] }) });

  const reset = () => { setForm(empty); setEditId(null); setOpen(false); };
  const edit = (c: Cuadrilla) => {
    setForm({ nombre: c.nombre, codigoCuadrilla: c.codigoCuadrilla ?? "", areaId: c.areaId ?? null, estado: c.estado });
    setEditId(c.id); setOpen(true);
  };
  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: name === "areaId" ? (value ? Number(value) : null) : value }));
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };
  const getNombreArea = (id: number | null | undefined) => areas.find(a => a.id === id)?.nombre ?? null;

  return (
    <AppShell>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "#1A202C" }}>Cuadrillas</h1>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B7280" }}>
              Gestione los grupos de trabajo y supervise su estado operativo.
            </p>
          </div>
          <button onClick={() => { reset(); setOpen(true); }} style={s.btnPrimary}>
            + Nueva Cuadrilla
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div style={s.stat}>
            <div style={s.statLabel}>Total Cuadrillas</div>
            <div style={{ ...s.statValue, color: "#1A202C" }}>{data.length}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Activas</div>
            <div style={{ ...s.statValue, color: "#2D6A4F" }}>{activas}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Inactivas</div>
            <div style={{ ...s.statValue, color: "#DC3545" }}>{inactivas}</div>
          </div>
        </div>

        {/* Filtros */}
        <div style={s.filterBar}>
          <input
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...s.input, flex: 1, minWidth: "200px" }}
          />
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
                  {["Código", "Cuadrilla", "Área", "Estado", "Acciones"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} style={{ borderTop: "1px solid #E2E8F0", background: i % 2 === 0 ? "#fff" : "#F8F9FA" }}>
                    <td style={s.td}>
                      <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>
                        {c.codigoCuadrilla ?? "-"}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "36px", height: "36px", borderRadius: "50%",
                          background: "#2D6A4F", color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "13px", fontWeight: 700, flexShrink: 0,
                        }}>
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 600, color: "#1A202C" }}>{c.nombre}</div>
                      </div>
                    </td>
                    <td style={s.td}>
                      {getNombreArea(c.areaId)
                        ? <Badge label={getNombreArea(c.areaId)!} color="amber" />
                        : <span style={{ color: "#9CA3AF", fontSize: "12px" }}>Sin área</span>
                      }
                    </td>
                    <td style={s.td}>
                      <Badge label={c.estado} color={c.estado === "ACTIVO" ? "green" : "gray"} />
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => edit(c)} style={s.btnIcon} title="Editar">✏️</button>
                        <button onClick={() => remove.mutate(c.id)} style={{ ...s.btnIcon, background: "#FFF0F0" }} title="Eliminar">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filtered.length > 0 && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid #E2E8F0", fontSize: "13px", color: "#9CA3AF" }}>
              Mostrando {filtered.length} de {data.length} cuadrillas
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={open}
        title={editId ? "Editar Cuadrilla" : "Nueva Cuadrilla"}
        subtitle="Complete la información para registrar la cuadrilla."
        onClose={reset}
      >
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <label style={s.label}>
              Nombre *
              <input name="nombre" placeholder="Ej. Cuadrilla Norte" value={form.nombre} onChange={change} required style={s.inputModal} />
            </label>
            <label style={s.label}>
              Código
              <input name="codigoCuadrilla" placeholder="Ej. CUA-001" value={form.codigoCuadrilla ?? ""} onChange={change} style={s.inputModal} />
            </label>
            <label style={s.label}>
              Área
              <select name="areaId" value={form.areaId ?? ""} onChange={change} style={s.inputModal}>
                <option value="">Sin área</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </label>
            <label style={s.label}>
              Estado
              <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                {["ACTIVO", "INACTIVO"].map(est => (
                  <label key={est} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
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
              {editId ? "Actualizar" : "Guardar Cuadrilla"}
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
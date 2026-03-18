import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";

type Empleado = {
    id: number;
    primerNombre: string;
    primerApellido: string;
    email: string;
    codigoEmpleado?: string | null;
    estado: string;
};

type EmpleadoForm = Omit<Empleado, "id"> & { password: string };

const empty: EmpleadoForm = { primerNombre: "", primerApellido: "", email: "", password: "", codigoEmpleado: "", estado: "ACTIVO" };

const fetcher = () => api.get<{ data: Empleado[] }>("/empleados").then(r => r.data.data);

export default function Empleado() {
    const qc = useQueryClient();
    const [form, setForm] = useState<EmpleadoForm>(empty);
    const [editId, setEditId] = useState<number | null>(null);
    const [open, setOpen] = useState(false);

    const { data = [], isLoading } = useQuery({ queryKey: ["empleados"], queryFn: fetcher });

    const invalidate = () => { qc.invalidateQueries({ queryKey: ["empleados"] }); reset(); };
    const create = useMutation({ mutationFn: (d: EmpleadoForm) => api.post("/empleados", d), onSuccess: invalidate });
    const update = useMutation({ mutationFn: (d: EmpleadoForm) => api.put(`/empleados/${editId}`, d), onSuccess: invalidate });
    const remove = useMutation({ mutationFn: (id: number) => api.delete(`/empleados/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["empleados"] }) });

    const reset = () => { setForm(empty); setEditId(null); setOpen(false); };
    const edit = (e: Empleado) => { setForm({ ...e, password: "" }); setEditId(e.id); setOpen(true); };
    const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };

    return (
        <div style={s.page}>
            <div style={s.header}>
                <h1 style={s.title}>Empleados</h1>
                <button style={s.btnPrimary} onClick={() => { reset(); setOpen(true); }}>+ Nuevo</button>
            </div>

            {open && (
                <div style={s.card}>
                    <h2 style={s.subtitle}>{editId ? "Editar" : "Nuevo"} empleado</h2>
                    <form onSubmit={submit}>
                        <div style={s.grid}>
                            {(["primerNombre", "primerApellido", "email", "codigoEmpleado"] as const).map(f => (
                                <label key={f} style={s.label}>
                                    {labels[f]}
                                    <input name={f} value={form[f] ?? ""} onChange={change} required={required.includes(f)} style={s.input} />
                                </label>
                            ))}
                            <label style={s.label}>
                                {editId ? "Nueva contraseña (opcional)" : "Contraseña *"}
                                <input name="password" type="password" value={form.password} onChange={change} required={!editId} style={s.input} />
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
                            <button type="submit" style={s.btnPrimary}>Guardar</button>
                            <button type="button" style={s.btnSecondary} onClick={reset}>Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={s.card}>
                {isLoading ? <p style={s.empty}>Cargando...</p> : data.length === 0 ? <p style={s.empty}>Sin registros</p> : (
                    <table style={s.table}>
                        <thead><tr style={s.thead}>
                            {["Código", "Nombre", "Email", "Estado", "Acciones"].map(h => <th key={h} style={s.th}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {data.map(e => (
                                <tr key={e.id} style={s.tr}>
                                    <td style={s.td}>{e.codigoEmpleado ?? "-"}</td>
                                    <td style={s.td}>{e.primerNombre} {e.primerApellido}</td>
                                    <td style={s.td}>{e.email}</td>
                                    <td style={s.td}><span style={e.estado === "ACTIVO" ? s.activo : s.inactivo}>{e.estado}</span></td>
                                    <td style={s.td}>
                                        <button style={s.btnEdit} onClick={() => edit(e)}>Editar</button>
                                        <button style={s.btnDelete} onClick={() => remove.mutate(e.id)}>Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

const labels: Record<string, string> = { primerNombre: "Primer nombre *", primerApellido: "Primer apellido *", email: "Email *", codigoEmpleado: "Código empleado" };
const required = ["primerNombre", "primerApellido", "email"];

const s: Record<string, React.CSSProperties> = {
    page: { padding: "24px", maxWidth: "1100px", margin: "0 auto" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
    title: { fontSize: "22px", fontWeight: 600, margin: 0 },
    subtitle: { fontSize: "16px", fontWeight: 500, marginBottom: "16px" },
    card: { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: "24px", marginBottom: "20px" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
    row: { display: "flex", gap: "8px", marginTop: "16px" },
    label: { display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 500 },
    input: { border: "1px solid #cbd5e1", borderRadius: "6px", padding: "7px 10px", fontSize: "14px" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
    thead: { background: "#f8fafc" },
    th: { padding: "10px 14px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #e2e8f0" },
    tr: { borderBottom: "1px solid #f1f5f9" },
    td: { padding: "10px 14px" },
    empty: { textAlign: "center", padding: "32px", color: "#888" },
    btnPrimary: { background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "14px" },
    btnSecondary: { background: "#f1f5f9", color: "#333", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "14px" },
    btnEdit: { background: "#f59e0b", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "13px", marginRight: "6px" },
    btnDelete: { background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "13px" },
    activo: { background: "#dcfce7", color: "#166534", borderRadius: "999px", padding: "2px 10px", fontSize: "12px" },
    inactivo: { background: "#fee2e2", color: "#991b1b", borderRadius: "999px", padding: "2px 10px", fontSize: "12px" },
};
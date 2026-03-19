import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";

type Medida = {
    id: number;
    nombre: string;
    iniciales: string;
};

type MedidaForm = Omit<Medida, "id">;

const empty: MedidaForm = { nombre: "", iniciales: "" };

const fetcher = () => api.get<{ data: Medida[] }>("/medidas").then(r => r.data.data);

export default function Medidas() {
    const qc = useQueryClient();
    const [form, setForm] = useState<MedidaForm>(empty);
    const [editId, setEditId] = useState<number | null>(null);
    const [open, setOpen] = useState(false);

    const { data = [], isLoading } = useQuery({ queryKey: ["medidas"], queryFn: fetcher });

    const invalidate = () => { qc.invalidateQueries({ queryKey: ["medidas"] }); reset(); };
    const create = useMutation({ mutationFn: (d: MedidaForm) => api.post("/medidas", d), onSuccess: invalidate });
    const update = useMutation({ mutationFn: (d: MedidaForm) => api.put(`/medidas/${editId}`, d), onSuccess: invalidate });
    const remove = useMutation({ mutationFn: (id: number) => api.delete(`/medidas/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["medidas"] }) });

    const reset = () => { setForm(empty); setEditId(null); setOpen(false); };
    const edit = (m: Medida) => { setForm({ nombre: m.nombre, iniciales: m.iniciales }); setEditId(m.id); setOpen(true); };
    const change = (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };

    return (
        <div style={s.page}>
            <div style={s.header}>
                <h1 style={s.title}>Medidas</h1>
                <button style={s.btnPrimary} onClick={() => { reset(); setOpen(true); }}>+ Nueva</button>
            </div>

            {open && (
                <div style={s.card}>
                    <h2 style={s.subtitle}>{editId ? "Editar" : "Nueva"} medida</h2>
                    <form onSubmit={submit}>
                        <div style={s.grid}>
                            <label style={s.label}>
                                Nombre *
                                <input name="nombre" value={form.nombre} onChange={change} required style={s.input} />
                            </label>
                            <label style={s.label}>
                                Iniciales *
                                <input name="iniciales" value={form.iniciales} onChange={change} required style={s.input} />
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
                            {["Nombre", "Iniciales", "Acciones"].map(h => <th key={h} style={s.th}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {data.map(m => (
                                <tr key={m.id} style={s.tr}>
                                    <td style={s.td}>{m.nombre}</td>
                                    <td style={s.td}>{m.iniciales}</td>
                                    <td style={s.td}>
                                        <button style={s.btnEdit} onClick={() => edit(m)}>Editar</button>
                                        <button style={s.btnDelete} onClick={() => remove.mutate(m.id)}>Eliminar</button>
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
};

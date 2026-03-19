import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";

type Medida = {
    id: number;
    nombre: string;
    iniciales: string;
};

type OrdenTrabajo = {
    id: number;
    numeroOrden: string;
    cantidadRequerida: number;
    medidaId?: number | null;
    pagoUnitario: number;
    fechaLimite?: string | null;
    estado: string;
};

type OrdenTrabajoForm = Omit<OrdenTrabajo, "id">;

const empty: OrdenTrabajoForm = {
    numeroOrden: "",
    cantidadRequerida: 0,
    medidaId: null,
    pagoUnitario: 0,
    fechaLimite: null,
    estado: "activo",
};

const fetcherOrdenes = () => api.get<{ data: OrdenTrabajo[] }>("/ordenes-trabajo").then(r => r.data.data);
const fetcherMedidas = () => api.get<{ data: Medida[] }>("/medidas").then(r => r.data.data);

export default function OrdenTrabajo() {
    const qc = useQueryClient();
    const [form, setForm] = useState<OrdenTrabajoForm>(empty);
    const [editId, setEditId] = useState<number | null>(null);
    const [open, setOpen] = useState(false);

    const { data = [], isLoading } = useQuery({ queryKey: ["ordenes-trabajo"], queryFn: fetcherOrdenes });
    const { data: medidas = [] } = useQuery({ queryKey: ["medidas"], queryFn: fetcherMedidas });

    const invalidate = () => { qc.invalidateQueries({ queryKey: ["ordenes-trabajo"] }); reset(); };
    const create = useMutation({ mutationFn: (d: OrdenTrabajoForm) => api.post("/ordenes-trabajo", d), onSuccess: invalidate });
    const update = useMutation({ mutationFn: (d: OrdenTrabajoForm) => api.put(`/ordenes-trabajo/${editId}`, d), onSuccess: invalidate });
    const remove = useMutation({ mutationFn: (id: number) => api.delete(`/ordenes-trabajo/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["ordenes-trabajo"] }) });

    const reset = () => { setForm(empty); setEditId(null); setOpen(false); };
    const edit = (o: OrdenTrabajo) => {
        setForm({
            numeroOrden: o.numeroOrden,
            cantidadRequerida: o.cantidadRequerida,
            medidaId: o.medidaId ?? null,
            pagoUnitario: o.pagoUnitario,
            fechaLimite: o.fechaLimite ?? null,
            estado: o.estado,
        });
        setEditId(o.id);
        setOpen(true);
    };
    const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(p => ({
            ...p,
            [name]: name === "cantidadRequerida" || name === "pagoUnitario" || name === "medidaId"
                ? value === "" ? null : Number(value)
                : value,
        }));
    };
    const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };

    const getMedidaNombre = (id?: number | null) => medidas.find(m => m.id === id)?.nombre ?? "-";

    return (
        <div style={s.page}>
            <div style={s.header}>
                <h1 style={s.title}>Órdenes de Trabajo</h1>
                <button style={s.btnPrimary} onClick={() => { reset(); setOpen(true); }}>+ Nueva</button>
            </div>

            {open && (
                <div style={s.card}>
                    <h2 style={s.subtitle}>{editId ? "Editar" : "Nueva"} orden de trabajo</h2>
                    <form onSubmit={submit}>
                        <div style={s.grid}>
                            <label style={s.label}>
                                Número de orden *
                                <input name="numeroOrden" value={form.numeroOrden} onChange={change} required style={s.input} />
                            </label>
                            <label style={s.label}>
                                Cantidad requerida *
                                <input name="cantidadRequerida" type="number" value={form.cantidadRequerida} onChange={change} required min={1} style={s.input} />
                            </label>
                            <label style={s.label}>
                                Medida
                                <select name="medidaId" value={form.medidaId ?? ""} onChange={change} style={s.input}>
                                    <option value="">Sin medida</option>
                                    {medidas.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.iniciales})</option>)}
                                </select>
                            </label>
                            <label style={s.label}>
                                Pago unitario *
                                <input name="pagoUnitario" type="number" value={form.pagoUnitario} onChange={change} required min={0} step="0.01" style={s.input} />
                            </label>
                            <label style={s.label}>
                                Fecha límite
                                <input name="fechaLimite" type="date" value={form.fechaLimite ?? ""} onChange={change} style={s.input} />
                            </label>
                            <label style={s.label}>
                                Estado
                                <select name="estado" value={form.estado} onChange={change} style={s.input}>
                                    <option value="activo">ACTIVO</option>
                                    <option value="inactivo">INACTIVO</option>
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
                            {["N° Orden", "Cantidad", "Medida", "Pago unitario", "Fecha límite", "Estado", "Acciones"].map(h => <th key={h} style={s.th}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {data.map(o => (
                                <tr key={o.id} style={s.tr}>
                                    <td style={s.td}>{o.numeroOrden}</td>
                                    <td style={s.td}>{o.cantidadRequerida}</td>
                                    <td style={s.td}>{getMedidaNombre(o.medidaId)}</td>
                                    <td style={s.td}>Q {Number(o.pagoUnitario).toFixed(2)}</td>
                                    <td style={s.td}>{o.fechaLimite ? new Date(o.fechaLimite).toLocaleDateString() : "-"}</td>
                                    <td style={s.td}><span style={o.estado === "activo" ? s.activo : s.inactivo}>{o.estado.toUpperCase()}</span></td>
                                    <td style={s.td}>
                                        <button style={s.btnEdit} onClick={() => edit(o)}>Editar</button>
                                        <button style={s.btnDelete} onClick={() => remove.mutate(o.id)}>Eliminar</button>
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
    activo: { background: "#dcfce7", color: "#166534", borderRadius: "999px", padding: "2px 10px", fontSize: "12px" },
    inactivo: { background: "#fee2e2", color: "#991b1b", borderRadius: "999px", padding: "2px 10px", fontSize: "12px" },
};

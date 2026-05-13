import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import { crudStyles as s } from "@/styles/crudStyles";

type Medida = { id: number; nombre: string; iniciales: string; };

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
    numeroOrden: "", cantidadRequerida: 0, medidaId: null,
    pagoUnitario: 0, fechaLimite: "", estado: "EN_PROCESO",
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
        setForm({ numeroOrden: o.numeroOrden, cantidadRequerida: o.cantidadRequerida, medidaId: o.medidaId ?? null, pagoUnitario: o.pagoUnitario, fechaLimite: o.fechaLimite ?? "", estado: o.estado });
        setEditId(o.id); setOpen(true);
    };
    const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(p => ({ ...p, [name]: name === "cantidadRequerida" || name === "pagoUnitario" || name === "medidaId" ? value === "" ? null : Number(value) : value }));
    };
    const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };
    const getMedidaNombre = (id?: number | null) => medidas.find(m => m.id === id)?.nombre ?? "-";

    return (
        <div style={s.page}>
            <div style={s.header}>
                <div style={s.titleGroup}>
                    <h1 style={s.title}>Órdenes de Trabajo</h1>
                    <p style={s.description}>Creación y seguimiento de órdenes de producción</p>
                </div>
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
                                    <option value="CREADA">CREADA</option>
                                    <option value="EN_PROCESO">EN_PROCESO</option>
                                    <option value="COMPLETADA">COMPLETADA</option>
                                    <option value="CANCELADA">CANCELADA</option>
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
                <div style={s.tableWrap}>
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
                                        <td style={s.td}><span style={["activo", "EN_PROCESO", "CREADA"].includes(o.estado) ? s.activo : s.inactivo}>{o.estado.toUpperCase()}</span></td>
                                        <td style={{ ...s.td, ...s.actionCell }}>
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
        </div>
    );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import { crudStyles as s } from "@/styles/crudStyles";

type OrdenTrabajo = { id: number; numeroOrden: string; cantidadRequerida: number; };
type Cuadrilla = { id: number; nombre: string; };

type AsignacionOrdenCuadrilla = {
    id: number;
    ordenTrabajoId: number;
    cuadrillaId: number;
    cantidadAsignada: number;
    estado: string;
};

type AsignacionForm = Omit<AsignacionOrdenCuadrilla, "id">;

const empty: AsignacionForm = { ordenTrabajoId: 0, cuadrillaId: 0, cantidadAsignada: 0, estado: "activo" };

const fetcherAsignaciones = () => api.get<{ data: AsignacionOrdenCuadrilla[] }>("/asignaciones-orden-cuadrilla").then(r => r.data.data);
const fetcherOrdenes = () => api.get<{ data: OrdenTrabajo[] }>("/ordenes-trabajo").then(r => r.data.data);
const fetcherCuadrillas = () => api.get<{ data: Cuadrilla[] }>("/cuadrillas").then(r => r.data.data);

export default function AsignacionOrdenCuadrilla() {
    const qc = useQueryClient();
    const [form, setForm] = useState<AsignacionForm>(empty);
    const [editId, setEditId] = useState<number | null>(null);
    const [open, setOpen] = useState(false);

    const { data = [], isLoading } = useQuery({ queryKey: ["asignaciones-orden-cuadrilla"], queryFn: fetcherAsignaciones });
    const { data: ordenes = [] } = useQuery({ queryKey: ["ordenes-trabajo"], queryFn: fetcherOrdenes });
    const { data: cuadrillas = [] } = useQuery({ queryKey: ["cuadrillas"], queryFn: fetcherCuadrillas });

    const invalidate = () => { qc.invalidateQueries({ queryKey: ["asignaciones-orden-cuadrilla"] }); reset(); };
    const create = useMutation({ mutationFn: (d: AsignacionForm) => api.post("/asignaciones-orden-cuadrilla", d), onSuccess: invalidate });
    const update = useMutation({ mutationFn: (d: AsignacionForm) => api.put(`/asignaciones-orden-cuadrilla/${editId}`, d), onSuccess: invalidate });
    const remove = useMutation({ mutationFn: (id: number) => api.delete(`/asignaciones-orden-cuadrilla/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["asignaciones-orden-cuadrilla"] }) });

    const reset = () => { setForm(empty); setEditId(null); setOpen(false); };

    const edit = (a: AsignacionOrdenCuadrilla) => {
        // Al editar, buscamos la orden correspondiente para rellenar cantidadAsignada
        const orden = ordenes.find(o => o.id === a.ordenTrabajoId);
        setForm({
            ordenTrabajoId: a.ordenTrabajoId,
            cuadrillaId: a.cuadrillaId,
            cantidadAsignada: orden?.cantidadRequerida ?? a.cantidadAsignada,
            estado: a.estado
        });
        setEditId(a.id);
        setOpen(true);
    };

    const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === "ordenTrabajoId") {
            const ordenId = Number(value);
            // Al cambiar la orden, buscamos su cantidadRequerida y la ponemos en cantidadAsignada
            const orden = ordenes.find(o => o.id === ordenId);
            setForm(p => ({
                ...p,
                ordenTrabajoId: ordenId,
                cantidadAsignada: orden?.cantidadRequerida ?? 0,
            }));
            return;
        }

        setForm(p => ({
            ...p,
            [name]: name === "cuadrillaId" ? Number(value) : value
        }));
    };

    const submit = (e: React.FormEvent) => { e.preventDefault(); editId ? update.mutate(form) : create.mutate(form); };
    const getOrdenNumero = (id: number) => ordenes.find(o => o.id === id)?.numeroOrden ?? "-";
    const getCuadrillaName = (id: number) => cuadrillas.find(c => c.id === id)?.nombre ?? "-";

    return (
        <div style={s.page}>
            <div style={s.header}>
                <div style={s.titleGroup}>
                    <h1 style={s.title}>Asignación de Orden a Cuadrilla</h1>
                    <p style={s.description}>Asignación de órdenes de trabajo a cuadrillas</p>
                </div>
                <button style={s.btnPrimary} onClick={() => { reset(); setOpen(true); }}>+ Nueva</button>
            </div>

            {open && (
                <div style={s.card}>
                    <h2 style={s.subtitle}>{editId ? "Editar" : "Nueva"} asignación</h2>
                    <form onSubmit={submit}>
                        <div style={s.grid}>
                            <label style={s.label}>
                                Orden de trabajo *
                                <select name="ordenTrabajoId" value={form.ordenTrabajoId} onChange={change} required style={s.input}>
                                    <option value={0}>Seleccionar orden</option>
                                    {ordenes.map(o => <option key={o.id} value={o.id}>Orden - {o.numeroOrden}</option>)}
                                </select>
                            </label>
                            <label style={s.label}>
                                Cuadrilla *
                                <select name="cuadrillaId" value={form.cuadrillaId} onChange={change} required style={s.input}>
                                    <option value={0}>Seleccionar cuadrilla</option>
                                    {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </label>
                            <label style={s.label}>
                                Cantidad asignada
                                <input
                                    name="cantidadAsignada"
                                    type="number"
                                    value={form.cantidadAsignada}
                                    readOnly
                                    style={{ ...s.input, backgroundColor: "#f0f0f0", cursor: "not-allowed" }}
                                />
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
                <div style={s.tableWrap}>
                    {isLoading ? <p style={s.empty}>Cargando...</p> : data.length === 0 ? <p style={s.empty}>Sin registros</p> : (
                        <table style={s.table}>
                            <thead><tr style={s.thead}>
                                {["Orden de trabajo", "Cuadrilla", "Cantidad asignada", "Estado", "Acciones"].map(h => <th key={h} style={s.th}>{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {data.map(a => (
                                    <tr key={a.id} style={s.tr}>
                                        <td style={s.td}>{getOrdenNumero(a.ordenTrabajoId)}</td>
                                        <td style={s.td}>{getCuadrillaName(a.cuadrillaId)}</td>
                                        <td style={s.td}>{a.cantidadAsignada}</td>
                                        <td style={s.td}><span style={a.estado === "activo" ? s.activo : s.inactivo}>{a.estado.toUpperCase()}</span></td>
                                        <td style={{ ...s.td, ...s.actionCell }}>
                                            <button style={s.btnEdit} onClick={() => edit(a)}>Editar</button>
                                            <button style={s.btnDelete} onClick={() => remove.mutate(a.id)}>Eliminar</button>
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
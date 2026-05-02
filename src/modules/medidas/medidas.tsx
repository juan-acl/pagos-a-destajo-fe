import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
import { crudStyles as s } from "@/styles/crudStyles";

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
                <div style={s.titleGroup}>
                    <h1 style={s.title}>Medidas</h1>
                    <p style={s.description}>Gestión de unidades de medida</p>
                </div>
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
                <div style={s.tableWrap}>
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
                                        <td style={{ ...s.td, ...s.actionCell }}>
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
        </div>
    );
}

export type Puesto = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  estado: string;
};

export type PuestoForm = Omit<Puesto, "id">;

export const empty: PuestoForm = {
  nombre: "",
  descripcion: "",
  estado: "ACTIVO",
};

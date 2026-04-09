type Area = {
  id: number;
  nombre: string;
  codigoArea?: string | null;
  estado: string;
};

type AreaForm = Omit<Area, "id">;

export const empty: AreaForm = {
  nombre: "",
  codigoArea: "",
  estado: "ACTIVO",
};

export type { Area, AreaForm };

export const puestoStats = [
  { label: "Total Puestos", value: 0, color: "text-gray-900" },
  { label: "Activos", value: 0, color: "text-[#2D6A4F]" },
  { label: "Inactivos", value: 0, color: "text-red-600" },
];

export interface FormField {
  name: string;
  label: string;
  type: "text" | "select" | "textarea";
  required?: boolean;
  fullWidth?: boolean;
  rows?: number;
  options?: { value: string; label: string }[];
}

export const puestoFormFields: FormField[] = [
  {
    name: "nombre",
    label: "Nombre",
    type: "text",
    required: true,
  },
  {
    name: "estado",
    label: "Estado",
    type: "select",
    options: [
      { value: "ACTIVO", label: "ACTIVO" },
      { value: "INACTIVO", label: "INACTIVO" },
    ],
  },
  {
    name: "descripcion",
    label: "Descripción",
    type: "textarea",
    rows: 3,
    fullWidth: true,
    required: true,
  },
];

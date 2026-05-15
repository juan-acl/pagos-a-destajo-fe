import type { Area } from "@/types/area.types";

export const areaStats = [
  { label: "Total Áreas", value: 0, color: "text-gray-900" },
  { label: "Activas", value: 0, color: "text-[#2D6A4F]" },
  { label: "Inactivas", value: 0, color: "text-red-600" },
];

export interface FormField {
  name: keyof Area;
  label: string;
  type: "text" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
  maxLength?: number;
}

export const areaFormFields: FormField[] = [
  {
    name: "nombre",
    label: "Nombre",
    type: "text",
    required: true,
  },
  {
    name: "codigoArea",
    label: "Código área",
    type: "text",
    maxLength: 6,
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
];

import { create } from "zustand";
import { persist } from "zustand/middleware";

type NamedRelation = {
  nombre?: string | null;
  nombreRol?: string | null;
  nombre_rol?: string | null;
};

type Empleado = {
  id: number;
  codigoEmpleado: string | null;
  primerNombre: string;
  segundoNombre?: string | null;
  primerApellido: string;
  segundoApellido?: string | null;
  email: string;
  pstPuesto?: number | null;
  estado: string;
  rol?: string | NamedRelation | null;
  roles?: Array<string | NamedRelation> | null;
  nombreRol?: string | null;
  rolNombre?: string | null;
  puesto?: NamedRelation | null;
  puestoNombre?: string | null;
};

type AuthState = {
  empleado: Empleado | null;
  isAuthenticated: boolean;
  login: (empleado: Empleado) => void;
  logout: () => void;
};

export const ADMIN_PUESTOS = [1, 41];

const normalize = (value?: string | null) =>
  (value ?? "")
    .toString()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

const relationToName = (relation?: string | NamedRelation | null) => {
  if (!relation) return "";
  if (typeof relation === "string") return relation;
  return relation.nombreRol ?? relation.nombre_rol ?? relation.nombre ?? "";
};

export const getRoleName = (empleado: Empleado | null | undefined) => {
  if (!empleado) return "";

  const candidates = [
    empleado.nombreRol,
    empleado.rolNombre,
    relationToName(empleado.rol),
    empleado.puestoNombre,
    relationToName(empleado.puesto),
    ...(empleado.roles ?? []).map(relationToName),
  ];

  return normalize(candidates.find((item) => item && item.trim().length > 0));
};

export const isAdmin = (pstPuesto: number | null | undefined) =>
  ADMIN_PUESTOS.includes(pstPuesto ?? -1);

export const isJefe = (empleado: Empleado | null | undefined) => {
  const role = getRoleName(empleado);
  return ["JEFE", "GOD", "JEFATURA"].includes(role);
};

export const canAccessBackoffice = (empleado: Empleado | null | undefined) =>
  isAdmin(empleado?.pstPuesto) || isJefe(empleado);

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      empleado: null,
      isAuthenticated: false,
      login: (empleado) => set({ empleado, isAuthenticated: true }),
      logout: () => set({ empleado: null, isAuthenticated: false }),
    }),
    { name: "auth-storage" }
  )
);

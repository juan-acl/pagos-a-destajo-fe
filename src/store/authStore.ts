import { create } from "zustand";
import { persist } from "zustand/middleware";

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
};

type AuthState = {
  empleado: Empleado | null;
  isAuthenticated: boolean;
  login: (empleado: Empleado) => void;
  logout: () => void;
};

export const ADMIN_PUESTOS = [1, 41];

export const isAdmin = (pstPuesto: number | null | undefined) =>
  ADMIN_PUESTOS.includes(pstPuesto ?? -1);

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
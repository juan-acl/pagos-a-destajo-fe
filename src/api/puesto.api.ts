import type { Puesto } from "@/types/puesto.types";
import api from ".";

export const fetchPuestos = () =>
  api.get<{ data: Puesto[] }>("/position-workers").then((r) => r.data.data);

import type { LoteProduccion, Planilla } from "@/types/planilla.types";
import api from ".";

export const fetchPlanillas = () =>
  api.get<{ data: Planilla[] }>("/planilla").then((r) => r.data.data);

export const fetchLotesProduccion = () =>
  api
    .get<{ data: LoteProduccion[] }>("/production-lot")
    .then((r) => r.data.data);

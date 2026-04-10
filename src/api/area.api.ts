import api from ".";
import type { Area } from "@/types/area.types";

export const fetchAreas = () =>
  api.get<{ data: Area[] }>("/area").then((r) => r.data.data);

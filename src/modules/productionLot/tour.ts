import type { DriveStep } from "driver.js";

export const PRODUCTION_LOT_TOUR_STEPS: DriveStep[] = [
  {
    element: "#production-lot-title",
    popover: {
      title: "Generación de Lote",
      description:
        "Desde este módulo generas lotes con la producción aprobada. Solo aplica para órdenes con modalidad Destajo.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#production-lot-stats",
    popover: {
      title: "Indicadores del módulo",
      description:
        "Estos datos resumen los paneles evaluados, los que ya están listos, los bloqueados y los lotes generados.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#production-lot-selector",
    popover: {
      title: "Seleccionar panel",
      description:
        "Elige una orden y cuadrilla para revisar si cumple las precondiciones necesarias antes de generar el lote.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#production-lot-candidates-table",
    popover: {
      title: "Estado de paneles",
      description:
        "Aquí puedes ver qué paneles están listos para lote y cuáles tienen bloqueos, como reportes pendientes o revisiones observadas.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#production-lot-lots-table",
    popover: {
      title: "Lotes generados",
      description:
        "Consulta el historial de lotes creados con sus piezas aprobadas, monto, estado y fecha de generación.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#production-lot-ayuda-btn",
    popover: {
      title: "¿Necesitas ayuda?",
      description:
        "Este botón vuelve a mostrar la guía interactiva del módulo.",
      side: "bottom",
      align: "end",
    },
  },
];

import type { DriveStep } from "driver.js";

export const PRODUCTION_REVIEW_TOUR_STEPS: DriveStep[] = [
  {
    element: "#production-review-title",
    popover: {
      title: "Revisión de Producción",
      description:
        "En este módulo revisas los reportes reales enviados por los operarios. Este flujo aplica únicamente para órdenes con modalidad Destajo.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#production-review-stats",
    popover: {
      title: "Resumen de revisiones",
      description:
        "Consulta rápidamente cuántos reportes están pendientes, cuántos ya fueron revisados y cuántos quedaron aprobados u observados.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#production-review-selector",
    popover: {
      title: "Reporte pendiente",
      description:
        "Selecciona el reporte que deseas revisar. Al elegirlo, se cargan los datos del empleado, la orden, la cuadrilla y la cantidad reportada.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#production-review-form",
    popover: {
      title: "Confirmar revisión",
      description:
        "Ingresa la cantidad aprobada. Si el rechazo supera el porcentaje permitido, deberás agregar observaciones antes de guardar.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "#production-review-history",
    popover: {
      title: "Historial",
      description:
        "Aquí aparecen las revisiones registradas. La tabla tiene paginación para consultar más registros sin saturar la pantalla.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#production-review-ayuda-btn",
    popover: {
      title: "¿Necesitas ayuda?",
      description:
        "Haz clic aquí para volver a ver la guía del módulo cuando lo necesites.",
      side: "bottom",
      align: "end",
    },
  },
];

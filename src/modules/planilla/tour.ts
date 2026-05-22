import type { DriveStep } from "driver.js";

export const PLANILLA_TOUR_STEPS: DriveStep[] = [
  {
    element: "#planilla-title",
    popover: {
      title: "Módulo de Planillas",
      description:
        "Aquí gestionas todas las planillas de pago de la organización. Puedes generarlas a partir de órdenes de trabajo, ejecutar pagos y rechazar planillas que requieran corrección.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#planilla-nuevo-btn",
    popover: {
      title: "Generar Planilla",
      description:
        "Haz clic aquí para crear una nueva planilla. Seleccionarás la orden de trabajo y el sistema calculará automáticamente los montos según la modalidad (Destajo o Pago por Día).",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#planilla-stats",
    popover: {
      title: "Resumen",
      description:
        "Visualiza el total de planillas, cuántas están pendientes de pago y cuántas ya han sido pagadas.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#planilla-filtros",
    popover: {
      title: "Búsqueda y Filtros",
      description:
        "Filtra las planillas por estado (Pendiente, En revisión, Pagado, Rechazado) para encontrar rápidamente la que necesitas.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#planilla-tabla",
    popover: {
      title: "Lista de Planillas",
      description:
        "Aquí aparecen todas las planillas registradas. Usa el botón de resultados para ver el detalle, el botón verde para ejecutar el pago y el botón rojo para rechazar la planilla.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#planilla-ayuda-btn",
    popover: {
      title: "¿Necesitas ayuda?",
      description:
        "Haz clic en este botón en cualquier momento para volver a ver esta guía interactiva.",
      side: "bottom",
      align: "end",
    },
  },
];

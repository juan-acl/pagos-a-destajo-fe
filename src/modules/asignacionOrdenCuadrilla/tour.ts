import type { DriveStep } from "driver.js";

export const ASIGNACION_ORDEN_TOUR_STEPS: DriveStep[] = [
  {
    element: "#asignacion-title",
    popover: {
      title: "🔗 Módulo de Asignación Orden-Cuadrilla",
      description: "Aquí distribuyes las órdenes de trabajo entre las cuadrillas de producción, definiendo cuántas unidades debe producir cada cuadrilla.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#asignacion-nuevo-btn",
    popover: {
      title: "➕ Nueva Asignación",
      description: "Haz clic aquí para asignar una orden a una cuadrilla. La cantidad se toma automáticamente de la orden seleccionada.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#asignacion-stats",
    popover: {
      title: "📊 Resumen de Asignaciones",
      description: "Visualiza el total de asignaciones y cuántas están activas o inactivas.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#asignacion-filtros",
    popover: {
      title: "🔍 Filtrar Asignaciones",
      description: "Busca por número de orden o nombre de cuadrilla, y filtra por estado para encontrar asignaciones rápidamente.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#asignacion-tabla",
    popover: {
      title: "📋 Lista de Asignaciones",
      description: "Aquí aparecen todas las asignaciones registradas. Usa ✏️ para editar y 🗑️ para eliminar una asignación.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#asignacion-ayuda-btn",
    popover: {
      title: "❓ ¿Necesitas ayuda?",
      description: "Haz clic aquí en cualquier momento para volver a ver esta guía interactiva.",
      side: "bottom",
      align: "end",
    },
  },
];

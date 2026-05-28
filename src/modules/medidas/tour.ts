import type { DriveStep } from "driver.js";

export const MEDIDAS_TOUR_STEPS: DriveStep[] = [
  {
    element: "#medidas-title",
    popover: {
      title: "📏 Módulo de Medidas",
      description: "Aquí gestionas las unidades de medida utilizadas en las órdenes de producción, como kilogramos, metros, piezas, etc.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#medidas-nuevo-btn",
    popover: {
      title: "➕ Nueva Medida",
      description: "Haz clic aquí para registrar una nueva unidad de medida. Necesitarás el nombre completo y las iniciales (por ejemplo: Kilogramo / kg).",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#medidas-stats",
    popover: {
      title: "📊 Resumen",
      description: "Visualiza el total de unidades de medida registradas en el sistema.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#medidas-filtros",
    popover: {
      title: "🔍 Buscar Medidas",
      description: "Escribe el nombre o las iniciales para filtrar rápidamente la lista de medidas.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#medidas-tabla",
    popover: {
      title: "📋 Lista de Medidas",
      description: "Aquí aparecen todas las medidas registradas. Usa ✏️ para editar y 🗑️ para eliminar. Ten cuidado al eliminar: si está en uso en una orden podría afectar registros existentes.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#medidas-ayuda-btn",
    popover: {
      title: "❓ ¿Necesitas ayuda?",
      description: "Haz clic aquí en cualquier momento para volver a ver esta guía interactiva.",
      side: "bottom",
      align: "end",
    },
  },
];

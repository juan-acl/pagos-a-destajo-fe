import type { DriveStep } from "driver.js";

export const ORDEN_TRABAJO_TOUR_STEPS: DriveStep[] = [
  {
    element: "#ordenes-title",
    popover: {
      title: "📋 Módulo de Órdenes de Trabajo",
      description: "Aquí gestionas las órdenes de producción. Cada orden define cuántas unidades se deben producir, el pago por unidad y la fecha límite.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#ordenes-nuevo-btn",
    popover: {
      title: "➕ Nueva Orden",
      description: "Haz clic aquí para crear una nueva orden de trabajo. El número de orden se genera automáticamente.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#ordenes-stats",
    popover: {
      title: "📊 Resumen de Órdenes",
      description: "Visualiza el total de órdenes, cuántas están activas e inactivas en el sistema.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#ordenes-filtros",
    popover: {
      title: "🔍 Filtrar Órdenes",
      description: "Busca por número de orden o filtra por estado para encontrar rápidamente lo que necesitas.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#ordenes-tabla",
    popover: {
      title: "📋 Lista de Órdenes",
      description: "Aquí aparecen todas las órdenes de trabajo. Usa ✏️ para editar y 🗑️ para eliminar. El pago se muestra por pieza o por día según la modalidad.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#ordenes-ayuda-btn",
    popover: {
      title: "❓ ¿Necesitas ayuda?",
      description: "Haz clic aquí en cualquier momento para volver a ver esta guía interactiva.",
      side: "bottom",
      align: "end",
    },
  },
];

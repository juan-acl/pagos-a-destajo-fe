import type { DriveStep } from "driver.js";

export const AREA_TOUR_STEPS: DriveStep[] = [
  {
    element: "#area-title",
    popover: {
      title: "Módulo de Áreas",
      description:
        "Aquí administras todas las áreas de producción de la organización. Puedes crear, editar y desactivar áreas desde esta pantalla.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#area-nuevo-btn",
    popover: {
      title: "Crear Área",
      description:
        "Haz clic aquí para registrar una nueva área. El sistema le asignará un código automático. Solo debes ingresar el nombre y el estado.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#area-stats",
    popover: {
      title: "Resumen",
      description:
        "Visualiza en tiempo real el total de áreas registradas, cuántas están activas y cuántas inactivas.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#area-filtros",
    popover: {
      title: "Búsqueda y Filtros",
      description:
        "Escribe el nombre o código de un área para encontrarla rápidamente. También puedes filtrar por estado (Activo / Inactivo).",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#area-tabla",
    popover: {
      title: "Lista de Áreas",
      description:
        "Aquí aparecen todas las áreas según los filtros aplicados. Puedes ordenar las columnas haciendo clic en su encabezado.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#area-ayuda-btn",
    popover: {
      title: "¿Necesitas ayuda?",
      description:
        "Haz clic en este botón en cualquier momento para volver a ver esta guía interactiva.",
      side: "bottom",
      align: "end",
    },
  },
];

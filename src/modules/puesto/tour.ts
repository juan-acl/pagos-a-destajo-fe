import type { DriveStep } from "driver.js";

export const PUESTO_TOUR_STEPS: DriveStep[] = [
  {
    element: "#puesto-title",
    popover: {
      title: "Módulo de Puestos",
      description:
        "Aquí defines los puestos de trabajo de tu organización. Cada puesto puede asignarse a empleados y cuadrillas.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#puesto-nuevo-btn",
    popover: {
      title: "Crear Puesto",
      description:
        "Haz clic aquí para registrar un nuevo puesto. Deberás ingresar el nombre, una descripción clara y el estado inicial.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#puesto-stats",
    popover: {
      title: "Resumen",
      description:
        "Aquí ves el total de puestos registrados y cuántos están activos o inactivos en este momento.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#puesto-filtros",
    popover: {
      title: "Búsqueda y Filtros",
      description:
        "Encuentra un puesto rápidamente escribiendo su nombre o descripción. También puedes filtrar por estado.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#puesto-tabla",
    popover: {
      title: "Lista de Puestos",
      description:
        "Aquí se listan todos los puestos según los filtros activos.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#puesto-ayuda-btn",
    popover: {
      title: "¿Necesitas ayuda?",
      description:
        "Haz clic en este botón en cualquier momento para volver a ver esta guía interactiva.",
      side: "bottom",
      align: "end",
    },
  },
];

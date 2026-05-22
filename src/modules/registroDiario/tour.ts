import type { DriveStep } from "driver.js";

export const REGISTRO_TOUR_STEPS: DriveStep[] = [
  {
    element: "#registro-title",
    popover: {
      title: "Gestión de Días",
      description:
        "Desde aquí registras los días laborales de las órdenes con modalidad Pago por Día. Cada registro queda vinculado a los empleados asignados a la cuadrilla de la orden.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#registro-orden",
    popover: {
      title: "Seleccionar Orden",
      description:
        "Elige la orden de trabajo con modalidad Pago por Día. Solo aparecen las órdenes de ese tipo. Al seleccionarla verás su tarifa diaria, la cantidad requerida y su estado actual.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#registro-fechas",
    popover: {
      title: "Rango de Fechas",
      description:
        "Define el período que deseas registrar. Los días pasados o del día de hoy quedan habilitados para pago de inmediato. Los días futuros quedan en estado Programado y se habilitan automáticamente cuando llega su fecha.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#registro-registrar-btn",
    popover: {
      title: "Registrar Días",
      description:
        "Confirma el registro para todos los empleados de la cuadrilla dentro del rango indicado. Los días ya registrados se ignoran, por lo que puedes ejecutar esta acción varias veces sin generar duplicados.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#registro-ayuda-btn",
    popover: {
      title: "¿Necesitas ayuda?",
      description:
        "Haz clic en este botón en cualquier momento para volver a ver esta guía interactiva.",
      side: "bottom",
      align: "end",
    },
  },
];

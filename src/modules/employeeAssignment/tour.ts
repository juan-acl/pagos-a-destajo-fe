import type { DriveStep } from "driver.js";

export const EMPLOYEE_ASSIGNMENT_TOUR_STEPS: DriveStep[] = [
  {
    element: "#employee-assignment-title",
    popover: {
      title: "Módulo de Asignaciones",
      description:
        "Desde aquí sincronizas los empleados de una cuadrilla con la orden de trabajo. La modalidad de pago ya viene definida desde Órdenes de Trabajo.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#employee-assignment-stats",
    popover: {
      title: "Resumen general",
      description:
        "Estos indicadores muestran cuántos paneles están activos, cuántos trabajan por destajo, cuántos por día y cuántos empleados ya fueron sincronizados.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#employee-assignment-selector",
    popover: {
      title: "Seleccionar orden y cuadrilla",
      description:
        "Elige una relación de orden y cuadrilla para revisar su modalidad, empleados activos y estado de sincronización.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#employee-assignment-members-table",
    popover: {
      title: "Miembros de la cuadrilla",
      description:
        "Aquí se muestran los empleados activos de la cuadrilla. Ya no se asignan metas individuales; solo se sincronizan para que participen en el flujo correspondiente.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "#employee-assignment-registered-table",
    popover: {
      title: "Asignaciones registradas",
      description:
        "Este listado muestra la relación entre empleado, orden, cuadrilla y modalidad. Usa la búsqueda para encontrar registros específicos.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#employee-assignment-ayuda-btn",
    popover: {
      title: "¿Necesitas ayuda?",
      description:
        "Puedes volver a abrir esta guía interactiva en cualquier momento desde este botón.",
      side: "bottom",
      align: "end",
    },
  },
];

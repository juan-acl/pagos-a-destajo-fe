import { useState, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

type Step = {
  element: string;
  title: string;
  description: string;
};

const TOUR_KEY = (module: string) => `tour_${module}_done`;

export function useTour(moduleKey: string, steps: Step[]) {
  const [tourDone, setTourDone] = useState(
    () => localStorage.getItem(TOUR_KEY(moduleKey)) === "done"
  );

  const startTour = useCallback(() => {
    const d = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0,0,0,0.5)",
      stagePadding: 8,
      stageRadius: 8,
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Siguiente →",
      prevBtnText: "← Anterior",
      doneBtnText: "¡Entendido!",
      onDestroyStarted: () => {
        localStorage.setItem(TOUR_KEY(moduleKey), "done");
        setTourDone(true); // <-- Esto dispara el re-render y muestra los ⓘ
        d.destroy();
      },
      steps: steps.map(s => ({
        element: s.element,
        popover: {
          title: s.title,
          description: s.description,
          side: "bottom" as const,
          align: "start" as const,
        },
      })),
    });
    d.drive();
  }, [moduleKey, steps]);

  const runIfFirst = useCallback(() => {
    if (localStorage.getItem(TOUR_KEY(moduleKey)) !== "done") {
      setTimeout(() => startTour(), 500);
    }
  }, [moduleKey, startTour]);

  const isDone = () => tourDone;

  return { runIfFirst, startTour, isDone, tourDone };
}
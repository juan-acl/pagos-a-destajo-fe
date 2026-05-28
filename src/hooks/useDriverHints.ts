import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useRef } from "react";

export type HintStep = {
  element: string;
  popover: {
    title: string;
    description: string;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
  };
};

export function useDriverHints(steps: HintStep[]) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const start = () => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    driverRef.current = driver({
      animate: true,
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      nextBtnText: "Siguiente →",
      prevBtnText: "← Anterior",
      doneBtnText: "Entendido ✓",
      progressText: "Paso {{current}} de {{total}}",
      steps: steps.map(s => ({
        element: s.element,
        popover: {
          ...s.popover,
          side: s.popover.side ?? "bottom",
          align: s.popover.align ?? "start",
        },
      })),
    });

    driverRef.current.drive();
  };

  const stop = () => {
    driverRef.current?.destroy();
    driverRef.current = null;
  };

  return { start, stop };
}
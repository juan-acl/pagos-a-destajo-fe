import { useEffect, useCallback } from "react";
import { driver } from "driver.js";
import type { DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuthStore } from "@/store/authStore";

export function useTour(
  steps: DriveStep[],
  tourKey: string,
  userId?: number | null,
) {
  const storageKey =
    userId != null ? `pad_tour_${tourKey}_v1_${userId}` : null;

  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Siguiente →",
      prevBtnText: "← Anterior",
      doneBtnText: "¡Entendido!",
      steps,
      onDestroyed: () => {
        if (storageKey) localStorage.setItem(storageKey, "1");
      },
    });
    driverObj.drive();
  }, [steps, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    if (localStorage.getItem(storageKey)) return;
    const timer = setTimeout(startTour, 700);
    return () => clearTimeout(timer);
  }, [storageKey, startTour]);

  return { startTour };
}

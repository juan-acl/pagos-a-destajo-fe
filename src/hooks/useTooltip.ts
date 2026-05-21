import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function useTooltip() {
  const showTooltip = (element: string, title: string, description: string) => {
    const d = driver({
      showButtons: [],
      overlayOpacity: 0,
      steps: [{
        element,
        popover: {
          title,
          description,
          side: "bottom" as const,
          align: "start" as const,
        }
      }]
    });
    d.drive();

    // Cerrar al hacer clic fuera
    const close = () => { d.destroy(); document.removeEventListener("click", close); };
    setTimeout(() => document.addEventListener("click", close), 100);
  };

  return { showTooltip };
}
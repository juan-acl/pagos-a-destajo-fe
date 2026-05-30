import type { MouseEvent } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

type TooltipSide = "top" | "right" | "bottom" | "left";
type TooltipAlign = "start" | "center" | "end";

type DriveTooltipProps = {
  id: string;
  title: string;
  description: string;
  side?: TooltipSide;
  align?: TooltipAlign;
  className?: string;
};

export default function DriveTooltip({
  id,
  title,
  description,
  side = "bottom",
  align = "start",
  className = "",
}: DriveTooltipProps) {
  const openTooltip = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const driverObj = driver({
      showProgress: false,
      allowClose: true,
      overlayOpacity: 0.6,
      stagePadding: 4,
      nextBtnText: "Entendido",
      doneBtnText: "Entendido",
      steps: [
        {
          element: `#${id}`,
          popover: {
            title,
            description,
            side,
            align,
          },
        },
      ],
    });

    driverObj.drive();
  };

  return (
    <button
      id={id}
      type="button"
      aria-label={`Ayuda: ${title}`}
      onClick={openTooltip}
      className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 bg-white text-[10px] font-bold leading-none text-gray-500 hover:border-[#2D6A4F] hover:text-[#2D6A4F] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/30 ${className}`}
    >
      ?
    </button>
  );
}

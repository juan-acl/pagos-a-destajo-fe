type HelpButtonProps = {
  onClick: () => void;
  active?: boolean;
};

export default function HelpButton({ onClick, active = false }: HelpButtonProps) {
  return (
    <button
      onClick={onClick}
      title="Tour de ayuda"
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer
        ${active
          ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-[#2D6A4F]"
        }
      `}
    >
      <span className="text-base">❓</span>
      {active ? "Salir de ayuda" : "¿Cómo funciona?"}
    </button>
  );
}
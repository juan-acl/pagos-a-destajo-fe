type ToastProps = {
  message: string | null;
  type?: "error" | "success" | "info";
  onClose: () => void;
};

const styles = {
  error: {
    container: "border-red-200 bg-red-50 text-red-700",
    title: "Error",
  },
  success: {
    container: "border-green-200 bg-green-50 text-green-700",
    title: "Operación exitosa",
  },
  info: {
    container: "border-blue-200 bg-blue-50 text-blue-700",
    title: "Información",
  },
};

export default function Toast({ message, type = "error", onClose }: ToastProps) {
  if (!message) return null;

  const style = styles[type];

  return (
    <div className="fixed top-5 right-5 z-[9999] w-[calc(100%-2rem)] max-w-md">
      <div
        role="alert"
        className={`rounded-xl border px-4 py-3 shadow-lg ${style.container}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold">{style.title}</p>
            <p className="mt-1 text-sm leading-relaxed">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border-0 bg-transparent px-2 py-1 text-lg leading-none cursor-pointer opacity-70 hover:opacity-100"
            aria-label="Cerrar mensaje"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

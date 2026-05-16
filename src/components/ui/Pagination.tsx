type PaginationProps = {
  page: number;
  total: number;
  pageSize?: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
};

const clampPage = (page: number, totalPages: number) => Math.min(Math.max(page, 1), totalPages);

export default function Pagination({
  page,
  total,
  pageSize = 10,
  itemLabel = "registro(s)",
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = clampPage(page, totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  if (total <= pageSize) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((item) => {
    if (item === 1 || item === totalPages) return true;
    return Math.abs(item - currentPage) <= 1;
  });

  return (
    <div className="px-5 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
      <p className="text-xs text-gray-500">
        Mostrando {from} - {to} de {total} {itemLabel}.
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 disabled:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>

        {pages.map((item, index) => {
          const previous = pages[index - 1];
          const showGap = previous && item - previous > 1;

          return (
            <span key={item} className="flex items-center gap-2">
              {showGap && <span className="text-xs text-gray-400">...</span>}
              <button
                type="button"
                onClick={() => onPageChange(item)}
                className={`min-w-8 px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                  item === currentPage
                    ? "bg-[#2D6A4F] border-[#2D6A4F] text-white"
                    : "bg-white border-gray-200 text-gray-700"
                }`}
              >
                {item}
              </button>
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 disabled:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

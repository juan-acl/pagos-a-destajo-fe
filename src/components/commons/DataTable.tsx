import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  isLoading?: boolean;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  entityLabel?: string;
};

export default function DataTable<T>({
  columns,
  data,
  isLoading,
  page,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  entityLabel = "registros",
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) return <p style={s.empty}>Cargando...</p>;
  if (data.length === 0) return <p style={s.empty}>Sin registros</p>;

  const hasPagination =
    page !== undefined &&
    totalPages !== undefined &&
    onPageChange !== undefined &&
    totalItems !== undefined &&
    itemsPerPage !== undefined;

  return (
    <>
      <table style={s.table}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} style={s.thead}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    ...s.th,
                    cursor: header.column.getCanSort() ? "pointer" : "default",
                    userSelect: "none",
                  }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                  {header.column.getIsSorted() === "asc"
                    ? " ↑"
                    : header.column.getIsSorted() === "desc"
                      ? " ↓"
                      : header.column.getCanSort()
                        ? " ↕"
                        : ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              style={{
                borderTop: "1px solid var(--neutral-dark)",
                background:
                  row.index % 2 === 0 ? "var(--white)" : "var(--neutral)",
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} style={s.td}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {hasPagination && (
        <div style={s.pagination}>
          <span style={s.paginationInfo}>
            {totalPages! > 0
              ? `Mostrando ${(page! - 1) * itemsPerPage! + 1}–${Math.min(page! * itemsPerPage!, totalItems!)} de ${totalItems} ${entityLabel}`
              : `0 ${entityLabel}`}
          </span>
          <div style={s.paginationControls}>
            <button
              onClick={() => onPageChange!(Math.max(1, page! - 1))}
              disabled={page === 1}
              style={{ ...s.pageBtn, ...(page === 1 ? s.pageBtnDisabled : {}) }}
            >
              ← Anterior
            </button>
            {Array.from({ length: totalPages! }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => onPageChange!(n)}
                style={{ ...s.pageBtn, ...(n === page ? s.pageBtnActive : {}) }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => onPageChange!(Math.min(totalPages!, page! + 1))}
              disabled={page === totalPages || totalPages === 0}
              style={{
                ...s.pageBtn,
                ...(page === totalPages || totalPages === 0
                  ? s.pageBtnDisabled
                  : {}),
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  thead: { background: "var(--neutral)" },
  th: {
    padding: "12px 16px",
    textAlign: "center",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  td: { padding: "12px 16px" },
  empty: { textAlign: "center", padding: "48px", color: "var(--text-muted)" },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderTop: "1px solid var(--neutral-dark)",
    flexWrap: "wrap",
    gap: "8px",
  },
  paginationInfo: { fontSize: "12px", color: "var(--text-muted)" },
  paginationControls: { display: "flex", gap: "6px", flexWrap: "wrap" },
  pageBtn: {
    padding: "5px 10px",
    fontSize: "12px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#374151",
    cursor: "pointer",
  },
  pageBtnActive: {
    background: "var(--primary)",
    color: "#fff",
    border: "1px solid var(--primary)",
  },
  pageBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
};

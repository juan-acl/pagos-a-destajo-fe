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

  if (isLoading) return <p className="text-center py-12 text-gray-400">Cargando...</p>;
  if (data.length === 0) return <p className="text-center py-12 text-gray-400">Sin resultados</p>;

  const hasPagination =
    page !== undefined &&
    totalPages !== undefined &&
    onPageChange !== undefined &&
    totalItems !== undefined &&
    itemsPerPage !== undefined;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-gray-50">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200"
                    style={{ cursor: header.column.getCanSort() ? "pointer" : "default", userSelect: "none" }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
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
                className={`border-t border-gray-100 ${row.index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasPagination && totalPages! > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-gray-400">
            Mostrando {(page! - 1) * itemsPerPage! + 1}–{Math.min(page! * itemsPerPage!, totalItems!)} de {totalItems} {entityLabel}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onPageChange!(Math.max(1, page! - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40 cursor-pointer hover:bg-gray-50"
            >
              ← Anterior
            </button>
            {Array.from({ length: totalPages! }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => onPageChange!(n)}
                className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer ${n === page ? "bg-[#2D6A4F] text-white border-[#2D6A4F]" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => onPageChange!(Math.min(totalPages!, page! + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40 cursor-pointer hover:bg-gray-50"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {hasPagination && totalPages! <= 1 && totalItems! > 0 && (
        <p className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          Mostrando {totalItems} {entityLabel}
        </p>
      )}
    </>
  );
}

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
};

export default function DataTable<T>({ columns, data, isLoading }: DataTableProps<T>) {
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

    return (
        <table style={s.table}>
            <thead>
                {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id} style={s.thead}>
                        {hg.headers.map(header => (
                            <th
                                key={header.id}
                                style={{
                                    ...s.th,
                                    cursor: header.column.getCanSort() ? "pointer" : "default",
                                    userSelect: "none",
                                }}
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
                {table.getRowModel().rows.map(row => (
                    <tr key={row.id} style={s.tr}>
                        {row.getVisibleCells().map(cell => (
                            <td key={cell.id} style={s.td}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

const s: Record<string, React.CSSProperties> = {
    table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
    thead: { background: "#f8fafc" },
    th: { padding: "10px 14px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #e2e8f0" },
    tr: { borderBottom: "1px solid #f1f5f9" },
    td: { padding: "10px 14px" },
    empty: { textAlign: "center", padding: "32px", color: "#888" },
};

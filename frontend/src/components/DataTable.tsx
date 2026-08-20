import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download } from "lucide-react";
import type { ReactNode } from "react";

interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowActions?: (item: T) => ReactNode;
  exportFilename?: string;
  className?: string;
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowActions,
  exportFilename = "table-export.csv",
  className = "",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((left, right) => {
      const a = left[sortKey as string];
      const b = right[sortKey as string];

      if (a === b) return 0;
      if (a == null) return 1;
      if (b == null) return -1;

      const comparison = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));

  const pagedData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [page, rowsPerPage, sortedData]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  function downloadCsv() {
    const header = columns.map((column) => column.header).join(",");
    const rows = sortedData.map((item) =>
      columns
        .map((column) => {
          const value = column.render ? column.render(item) : item[column.key as string];
          const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", exportFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`panel rounded-[24px] p-4 ${className}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Data table</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Sortable, paginated, exportable enterprise list.</p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950/80 dark:text-slate-300">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.header)}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className="sticky top-0 z-10 border-b border-slate-200/70 px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em]"
                >
                  <button
                    type="button"
                    onClick={() => column.sortable && toggleSort(String(column.key))}
                    className={`flex w-full items-center justify-between gap-2 ${column.sortable ? "cursor-pointer hover:text-slate-900 dark:hover:text-white" : "cursor-default"}`}
                  >
                    <span>{column.header}</span>
                    {column.sortable && sortKey === String(column.key) ? (
                      sortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : null}
                  </button>
                </th>
              ))}
              {rowActions ? <th className="sticky top-0 z-10 border-b border-slate-200/70 px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em]">Actions</th> : null}
            </tr>
          </thead>

          <tbody className="text-sm text-slate-700 dark:text-slate-200">
            {pagedData.map((item, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-slate-200/80 transition hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-900/70"
              >
                {columns.map((column, columnIndex) => (
                  <td key={columnIndex} className="px-4 py-4 align-top">
                    {column.render ? column.render(item) : String(item[column.key as string] ?? "-")}
                  </td>
                ))}
                {rowActions ? <td className="px-4 py-4 align-top">{rowActions(item)}</td> : null}
              </tr>
            ))}
            {pagedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No records found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
          <span>
            Showing <strong>{pagedData.length}</strong> of <strong>{sortedData.length}</strong>
          </span>
          <label className="inline-flex items-center gap-2">
            Rows:
            <select
              value={rowsPerPage}
              onChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(1);
              }}
              className="input-field w-24"
            >
              {[5, 8, 12, 20].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/90 px-3 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/70 dark:bg-slate-900/70"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/90 px-3 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/70 dark:bg-slate-900/70"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;

import React, { useMemo, useState } from 'react';

type Column<T> = {
  key: string;
  title: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  className?: string;
  pageSize?: number;
  searchable?: boolean;
};

function SortIcon({ dir }: { dir: 'asc' | 'desc' | null }) {
  return <span className="ml-2 text-xs text-slate-400">{dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : ''}</span>;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  className = '',
  pageSize = 10,
  searchable = true,
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let rows = data.slice();
    if (s) {
      rows = rows.filter((r) =>
        Object.values(r).some((v) => String(v).toLowerCase().includes(s))
      );
    }

    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return sortDir === 'asc' ? -1 : 1;
        if (bv == null) return sortDir === 'asc' ? 1 : -1;
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }

    return rows;
  }, [data, search, sortKey, sortDir]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(key: string, sortable?: boolean) {
    if (!sortable) return;
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(1);
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        {searchable && (
          <input
            aria-label="Search table"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search..."
            className="input-field max-w-sm"
          />
        )}

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <div className="text-xs text-slate-500">{total} results</div>
          <select
            value={pageSize}
            onChange={() => { setPage(1); /* pageSize is prop; keep default pageSize only */ }}
            className="input-field w-28"
            aria-label="Page size"
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      <div className={`overflow-hidden rounded-[12px] border border-slate-200/70 bg-white/80 dark:border-slate-700/70 dark:bg-slate-900/75`}>
        <table className="min-w-full table-auto">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300 ${col.sortable ? 'cursor-pointer select-none' : ''}`}
                  onClick={() => handleSort(col.key, col.sortable)}
                >
                  <div className="flex items-center">
                    <span>{col.title}</span>
                    {col.sortable && <SortIcon dir={sortKey === col.key ? sortDir : null} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                  No results
                </td>
              </tr>
            ) : (
              visible.map((row, idx) => (
                <tr key={idx} className="border-t border-slate-100 even:bg-slate-50/50 dark:border-slate-800/60">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-300">Page {page} of {pages}</div>
        <div className="inline-flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-ghost"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="btn-primary"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download } from 'lucide-react';
import { downloadCsv } from '../../utils/exportCsv';
import './DataTable.css';

/**
 * Generic list table for the SuperAdmin console. Reuses the app's existing
 * `.appt-table` styling (defined in AppointmentsPage.css/Dashboard.css,
 * already bundled) so every SuperAdmin screen looks consistent with the
 * business-admin tables instead of inventing a new visual pattern.
 *
 * Columns opt into click-to-sort with `sortable: true`. Sorting reads
 * `row[col.key]` by default; pass `sortValue: row => value` for columns
 * whose displayed content isn't the raw sort value (dates, nested cells).
 *
 * Pagination is opt-in via `paginated` — CSV export (above) always exports
 * every sorted row regardless of page, only the on-screen table is sliced.
 */
export default function DataTable({
  columns, rows, rowKey = 'id', onRowClick, emptyMessage = 'No records found.',
  getRowId, highlightRowId, exportable = false, exportFilename = 'export.csv',
  paginated = false, pageSizeOptions = [10, 20, 30, 50, 100], defaultPageSize = 10,
  defaultSortKey = null, defaultSortDir = 'asc',
}) {
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState(defaultSortDir);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(1);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find(c => c.key === sortKey);
    const getValue = col?.sortValue || (row => row[sortKey]);
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, columns, sortKey, sortDir]);

  // A filter change (or page-size change) can easily leave `page` pointing
  // past the end of the new result set — snap back to page 1 instead of
  // showing a blank table.
  useEffect(() => { setPage(1); }, [rows, pageSize]);

  const toggleSort = (col) => {
    if (!col.sortable) return;
    if (sortKey === col.key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(col.key); setSortDir('asc'); }
  };

  if (rows.length === 0) {
    return <div className="empty-state"><p>{emptyMessage}</p></div>;
  }

  const totalPages = paginated && pageSize !== 'All' ? Math.max(1, Math.ceil(sortedRows.length / pageSize)) : 1;
  const pageRows = paginated && pageSize !== 'All'
    ? sortedRows.slice((page - 1) * pageSize, page * pageSize)
    : sortedRows;
  const rangeStart = sortedRows.length === 0 ? 0 : (page - 1) * (pageSize === 'All' ? sortedRows.length : pageSize) + 1;
  const rangeEnd = pageSize === 'All' ? sortedRows.length : Math.min(page * pageSize, sortedRows.length);

  return (
    <div className="appt-table card">
      {(exportable || paginated) && (
        <div className="sa-table-toolbar">
          {paginated && (
            <label className="sa-page-size">
              Rows per page
              <select
                value={pageSize}
                onChange={e => setPageSize(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              >
                {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
                <option value="All">All</option>
              </select>
            </label>
          )}
          {exportable && (
            <button type="button" className="btn btn-ghost btn-sm sa-toolbar-export" onClick={() => downloadCsv(exportFilename, columns, sortedRows)}>
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>
      )}
      {/* Only this inner div scrolls horizontally — keeps the toolbar and
          pagination footer pinned in view when a wide table is swiped on
          mobile, instead of them scrolling out of reach with the table. */}
      <div className="dt-scroll-x">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={col.sortable ? 'sa-th-sortable' : ''}
                  onClick={() => toggleSort(col)}
                >
                  <span className="sa-th-inner">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key
                        ? (sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
                        : <ChevronsUpDown size={13} className="sa-th-sort-idle" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(row => {
              const rowId = getRowId?.(row);
              return (
              <tr
                key={row[rowKey]}
                id={rowId}
                className={[
                  onRowClick ? 'sa-row-clickable' : '',
                  rowId && highlightRowId && rowId === highlightRowId ? 'row-highlighted' : '',
                ].filter(Boolean).join(' ') || undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map(col => (
                  <td key={col.key} onClick={col.stopRowClick ? (e) => e.stopPropagation() : undefined}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {paginated && (
        <div className="sa-table-pagination">
          <span className="sa-page-info">Showing {rangeStart} to {rangeEnd} of {sortedRows.length} entries</span>
          <div className="sa-page-nav">
            <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

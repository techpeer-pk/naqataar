// CSV export for DataTable columns — reused across every SuperAdmin table
// instead of a one-off per page. Columns opt in/out of what gets exported
// via `exportValue` (plain-text override, for cells whose `render` is JSX
// with no single plain value) and `noExport` (skip entirely, e.g. an
// Actions column of buttons has nothing meaningful to export).
function escapeCell(value) {
  const s = value == null ? '' : String(value);
  return /["\r\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function cellValue(col, row) {
  if (col.exportValue) return col.exportValue(row);
  const raw = row[col.key];
  return (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') ? raw : '';
}

// Stamps the export moment into the filename (users.csv -> users_2026-07-24_1305.csv)
// so re-exporting later doesn't silently overwrite an earlier download of the same name.
function withTimestamp(filename) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? `${filename}_${stamp}` : `${filename.slice(0, dot)}_${stamp}${filename.slice(dot)}`;
}

export function downloadCsv(filename, columns, rows) {
  const exportable = columns.filter(c => !c.noExport);
  const header = exportable.map(c => escapeCell(c.header)).join(',');
  const lines = rows.map(row => exportable.map(c => escapeCell(cellValue(c, row))).join(','));
  const csv = [header, ...lines].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = withTimestamp(filename);
  link.click();
  URL.revokeObjectURL(url);
}

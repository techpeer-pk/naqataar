// Generic array-of-objects -> downloadable file helpers, used by admin
// "export data" panels (see AppointmentsPage). xlsx is dynamically imported
// so its bundle cost is only paid when someone actually picks that format.
import { format } from 'date-fns';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// CSV/JSON are plain text, so a Date needs an unambiguous, locale-proof
// string — "DD-MM-YYYY hh:mm:ss AM" is fine for a human reading Excel, but
// as raw text it depends on Excel's locale to guess the day/month order.
function csvValue(value) {
  return value instanceof Date ? format(value, 'yyyy-MM-dd HH:mm:ss') : value;
}

function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportToCsv(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => csvEscape(csvValue(row[h]))).join(',')),
  ];
  downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function exportToJson(rows, filename) {
  downloadBlob(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }), filename);
}

// SheetJS's own Date -> Excel-serial conversion (via json_to_sheet's
// `cellDates` option) compensates for timezone by diffing the machine's
// *current* UTC offset against the Excel epoch date's (1899-12-31)
// *historical* local offset. For zones whose 1899 local-mean-time offset
// wasn't a round number of minutes (Karachi: UTC+4:28 back then vs. UTC+5
// now), that mismatch bakes a several-second drift into every exported
// timestamp. Computing the serial ourselves from local wall-clock
// components sidesteps that bug entirely — Excel just reads the serial we
// hand it and formats it, no further timezone math involved.
function excelSerialFromLocalDate(d) {
  const localWallClockAsUtc = Date.UTC(
    d.getFullYear(), d.getMonth(), d.getDate(),
    d.getHours(), d.getMinutes(), d.getSeconds(),
  );
  return (localWallClockAsUtc - Date.UTC(1899, 11, 30)) / 86400000;
}

export async function exportToXlsx(rows, filename) {
  const XLSX = await import('xlsx');
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const rowsForSheet = rows.map(row => {
    const out = {};
    for (const h of headers) out[h] = row[h] instanceof Date ? excelSerialFromLocalDate(row[h]) : row[h];
    return out;
  });
  const sheet = XLSX.utils.json_to_sheet(rowsForSheet);
  // Re-mark the originally-Date columns as Excel date cells (number + date
  // format) so Excel sorts/filters them as dates, not as plain numbers.
  rows.forEach((row, i) => {
    headers.forEach((h, colIdx) => {
      if (!(row[h] instanceof Date)) return;
      const cell = sheet[XLSX.utils.encode_cell({ r: i + 1, c: colIdx })];
      if (cell) { cell.t = 'n'; cell.z = 'dd-mm-yyyy hh:mm:ss AM/PM'; }
    });
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Data');
  XLSX.writeFile(book, filename);
}

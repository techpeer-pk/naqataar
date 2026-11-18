/** Case-insensitive substring match across the given field names. */
export function filterBySearch(rows, term, fields) {
  const q = term.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(row =>
    fields.some(field => String(row[field] ?? '').toLowerCase().includes(q))
  );
}

import { useEffect, useRef, useState } from 'react';
import { loadScript, loadStyle } from '../../utils/loadExternalScript';
import './OpsDataTable.css';

// jQuery + DataTables.net, loaded from CDN — per explicit request, instead of
// the app's existing hand-rolled components/superadmin/DataTable.jsx. Scoped
// entirely to this component: nothing else in the app imports jQuery, and
// this only fetches the scripts the first time an OpsDataTable actually
// mounts (an Operations page that never renders a table, like OverviewPage,
// never pays for it). See docs/Operations-Console.md.
// Every URL below was fetched and inspected directly (not guessed from
// memory) before pinning — cdnjs's `datatables.net-dt` package turned out to
// be a 579-byte module-bundler glue shim, not the real library, so this now
// pulls DataTables itself (core, Buttons, SearchBuilder) from DataTables'
// OWN CDN, cdn.datatables.net — the same host their own example pages use —
// which hosts the real files directly with no shim traps. jQuery, JSZip
// (Excel export) and pdfmake (PDF export) aren't DataTables' own libraries,
// so those still come from cdnjs.
const JQUERY_SRC            = 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js';
const DT_JS                 = 'https://cdn.datatables.net/2.1.8/js/dataTables.min.js';
const DT_CSS                = 'https://cdn.datatables.net/2.1.8/css/dataTables.dataTables.min.css';
const DT_BUTTONS_JS         = 'https://cdn.datatables.net/buttons/3.1.2/js/dataTables.buttons.min.js';
const DT_BUTTONS_CSS        = 'https://cdn.datatables.net/buttons/3.1.2/css/buttons.dataTables.min.css';
const DT_BUTTONS_HTML5_JS   = 'https://cdn.datatables.net/buttons/3.1.2/js/buttons.html5.min.js';
const DT_BUTTONS_PRINT_JS   = 'https://cdn.datatables.net/buttons/3.1.2/js/buttons.print.min.js';
const DT_BUTTONS_COLVIS_JS  = 'https://cdn.datatables.net/buttons/3.1.2/js/buttons.colVis.min.js';
const DT_SEARCHBUILDER_JS   = 'https://cdn.datatables.net/searchbuilder/1.8.1/js/dataTables.searchBuilder.min.js';
const DT_SEARCHBUILDER_CSS  = 'https://cdn.datatables.net/searchbuilder/1.8.1/css/searchBuilder.dataTables.min.css';
const JSZIP_JS               = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const PDFMAKE_JS             = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.3.3/pdfmake.min.js';
const PDFMAKE_VFS_JS         = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.3.3/vfs_fonts.min.js';

// Cached on `window`, not a module-level `let` — this file re-executes on
// every dev-server hot-reload, which would otherwise reset a module-level
// cache and race a second load attempt against the first. `window` survives
// HMR. If you're iterating on THIS file, a hard refresh (not just HMR) is
// the only way to pick up a URL change here, since a stale resolved promise
// stays cached on `window` across hot-reloads.
function ensureDataTablesLoaded() {
  if (!window.__opsDataTablesLoad) {
    window.__opsDataTablesLoad = loadScript(JQUERY_SRC)
      .then(() => loadScript(DT_JS))
      .then(() => {
        // Confirm DataTables core actually registered itself on jQuery
        // before loading any extension against it — extensions throw an
        // opaque "Cannot read properties of undefined" otherwise.
        if (typeof window.jQuery?.fn?.DataTable !== 'function') {
          throw new Error('DataTables core script loaded but did not register on jQuery ($.fn.DataTable missing)');
        }
      })
      .then(() => Promise.all([loadStyle(DT_CSS), loadStyle(DT_BUTTONS_CSS), loadStyle(DT_SEARCHBUILDER_CSS)]))
      .then(() => loadScript(DT_BUTTONS_JS))
      .then(() => Promise.all([loadScript(DT_BUTTONS_HTML5_JS), loadScript(DT_BUTTONS_PRINT_JS), loadScript(DT_BUTTONS_COLVIS_JS), loadScript(JSZIP_JS)]))
      .then(() => loadScript(PDFMAKE_JS))
      .then(() => loadScript(PDFMAKE_VFS_JS))
      .then(() => loadScript(DT_SEARCHBUILDER_JS));
  }
  return window.__opsDataTablesLoad;
}

// Escapes any interpolated field before it goes into a column's `html`
// string — every column below pulls from user-submitted data (customer
// name, email, notes...), so this is the one thing standing between a
// booking and a stored-XSS payload landing in an internal console.
export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * columns: [{ title, value: row => string|number (sort/search/plain text),
 *              html?: row => string (pre-escaped HTML for display only),
 *              visible?: boolean (default true — hidden columns are still
 *              toggleable via the "Columns" button, just not shown up front,
 *              so a wide table can default to its most-used fields) }]
 * rows: plain array of row objects (already filtered/searched by the caller
 * via its own toolbar — this is a second, finer client-side search/sort/
 * export layer on top, same as SuperAdmin's DataTable.jsx already does).
 */
export default function OpsDataTable({ columns, rows, onRowClick, emptyMessage = 'No records found.', exportFilename = 'export' }) {
  const tableRef = useRef(null);
  const dtRef    = useRef(null);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    ensureDataTablesLoaded()
      .then(() => {
        if (cancelled || !tableRef.current) return;
        const $ = window.jQuery;
        dtRef.current = $(tableRef.current).DataTable({
          data: rows,
          columns: columns.map(c => ({
            title: c.title,
            data: null,
            visible: c.visible !== false,
            // Explicit `type` (e.g. 'string') lets a caller opt a column out
            // of DataTables' automatic type-sniffing — needed for any column
            // whose value looks like a date, since auto-detecting it as type
            // 'date' makes SearchBuilder require the separate DateTime
            // library (not loaded here) and throw instead of rendering a
            // condition for it. Omitted (undefined) preserves auto-detection
            // for every column that already worked before this was added.
            type: c.type,
            render: (data, type) => (type === 'display' && c.html) ? c.html(data) : (c.value ? c.value(data) ?? '' : ''),
          })),
          pageLength: 25,
          lengthMenu: [10, 25, 50, 100],
          order: [],
          // DataTables 2.x replaced the old `dom` string with this `layout`
          // object — a `dom: "<'...'Bf>t<'...'lip>"` string (the pre-2.0 way
          // to wire in Buttons) silently fails to render anything against
          // the 2.x build, which is what happened here the first time.
          // No 'search' slot — every Ops page already has its own styled
          // search box above the table (feeding `rows`), so DataTables' own
          // generic search input was just a second, differently-styled
          // search box duplicating it. SearchBuilder is a different thing
          // (per-column AND/OR condition queries, not a plain text search)
          // so it stays.
          layout: {
            top1: 'searchBuilder',
            topStart: 'buttons',
            bottomStart: ['pageLength', 'info'],
            bottomEnd: 'paging',
          },
          searchBuilder: { columns: columns.map((c, i) => i) },
          buttons: [
            { extend: 'copyHtml5', text: 'Copy', className: 'btn btn-ghost btn-sm' },
            { extend: 'csvHtml5', text: 'CSV', filename: exportFilename, className: 'btn btn-ghost btn-sm' },
            { extend: 'excelHtml5', text: 'Excel', filename: exportFilename, className: 'btn btn-ghost btn-sm' },
            { extend: 'pdfHtml5', text: 'PDF', filename: exportFilename, className: 'btn btn-ghost btn-sm' },
            { extend: 'print', text: 'Print', className: 'btn btn-ghost btn-sm' },
            { extend: 'colvis', text: 'Columns', className: 'btn btn-ghost btn-sm' },
          ],
          language: { emptyTable: emptyMessage },
        });
        if (onRowClick) {
          $(tableRef.current).on('click', 'tbody tr', function handleRowClick() {
            const rowData = dtRef.current?.row(this).data();
            if (rowData) onRowClick(rowData);
          });
        }
      })
      .catch(err => {
        // Fail loudly instead of leaving a silently blank <table> — this is
        // exactly what happened once already (a bad CDN URL, then a dom→
        // layout API mismatch), both invisible without this.
        console.error('OpsDataTable: DataTables init failed', err);
        if (!cancelled) setInitError(err?.message || 'Failed to load the data table.');
      });

    return () => {
      cancelled = true;
      if (dtRef.current) {
        dtRef.current.destroy();
        dtRef.current = null;
      }
    };
    // Re-init (destroy + recreate) whenever the filtered row set identity
    // changes — the caller's own useMemo already only produces a new array
    // when search/status/date filters actually change, so this doesn't
    // thrash on every render.
  }, [rows]);

  return (
    <div className="ops-datatable-wrap">
      {initError && (
        <p style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          Table failed to load ({initError}) — check the browser console and network tab.
        </p>
      )}
      <table ref={tableRef} className="ops-datatable display" style={{ width: '100%' }} />
    </div>
  );
}

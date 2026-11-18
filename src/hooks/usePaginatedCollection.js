import { useState, useCallback, useRef } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Pagination over a top-level Firestore collection, for the SuperAdmin
 * console's admin tables. Two modes, chosen per call site:
 *
 * - 'append' (default) — "Load more" style: each page's rows are appended
 *   onto the last, `rows` grows cumulatively. Unchanged from before this
 *   file grew a 'page' mode — every existing call site keeps working
 *   exactly as-is without passing any new option.
 * - 'page' — traditional prev/next paging: `rows` is only ever the current
 *   page, with a page-size selector (10/20/30/50/100) that resets to page 1
 *   when changed. Needs a cursor STACK (not just the last cursor) so "go
 *   back a page" is possible — Firestore cursors are forward-only.
 */
export function usePaginatedCollection(collectionName, { pageSize: initialPageSize = 25, orderByField = 'createdAt', mode = 'append' } = {}) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage]       = useState(0);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const lastDoc  = useRef(null);   // 'append' mode cursor
  const cursors  = useRef([null]); // 'page' mode cursor stack — cursors[i] = doc to startAfter for page i

  const fetchAppend = useCallback(async (reset, size) => {
    setLoading(true);
    try {
      const constraints = [orderBy(orderByField, 'desc'), limit(size + 1)];
      if (!reset && lastDoc.current) constraints.push(startAfter(lastDoc.current));
      const snap = await getDocs(query(collection(db, collectionName), ...constraints));
      const docs = snap.docs.slice(0, size);
      lastDoc.current = docs[docs.length - 1] || null;
      setHasMore(snap.docs.length > size);
      const page = docs.map(d => ({ id: d.id, ...d.data() }));
      setRows(prev => reset ? page : [...prev, ...page]);
    } finally {
      setLoading(false);
    }
  }, [collectionName, orderByField]);

  // size === 'all' skips the limit() entirely — fetches every doc in the
  // collection in one go, no cursor, no next page.
  const fetchPageIndexed = useCallback(async (pageIndex, size) => {
    setLoading(true);
    try {
      const constraints = [orderBy(orderByField, 'desc')];
      if (size !== 'all') constraints.push(limit(size + 1));
      const cursor = cursors.current[pageIndex];
      if (cursor) constraints.push(startAfter(cursor));
      const snap = await getDocs(query(collection(db, collectionName), ...constraints));
      const docs = size === 'all' ? snap.docs : snap.docs.slice(0, size);
      cursors.current[pageIndex + 1] = docs[docs.length - 1] || null;
      setHasMore(size !== 'all' && snap.docs.length > size);
      setRows(docs.map(d => ({ id: d.id, ...d.data() })));
      setPage(pageIndex);
    } finally {
      setLoading(false);
    }
  }, [collectionName, orderByField]);

  const loadMore = useCallback(() => fetchAppend(false, pageSize), [fetchAppend, pageSize]);

  const reload = useCallback(() => {
    if (mode === 'page') { cursors.current = [null]; return fetchPageIndexed(0, pageSize); }
    lastDoc.current = null;
    return fetchAppend(true, pageSize);
  }, [mode, fetchAppend, fetchPageIndexed, pageSize]);

  const nextPage = useCallback(() => fetchPageIndexed(page + 1, pageSize), [fetchPageIndexed, page, pageSize]);
  const prevPage = useCallback(() => fetchPageIndexed(page - 1, pageSize), [fetchPageIndexed, page, pageSize]);

  const setPageSize = useCallback((size) => {
    cursors.current = [null];
    lastDoc.current = null;
    setPageSizeState(size);
    if (mode === 'page') fetchPageIndexed(0, size);
    else fetchAppend(true, size);
  }, [mode, fetchPageIndexed, fetchAppend]);

  // Exposed for optimistic local patches after an edit/delete, so a mutation
  // doesn't have to reload() and lose any pages already loaded via loadMore().
  return { rows, setRows, loading, hasMore, hasPrev: page > 0, page, pageSize, setPageSize, loadMore, nextPage, prevPage, reload };
}

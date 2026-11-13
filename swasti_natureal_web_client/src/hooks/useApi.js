import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Runs `fetcher` whenever `deps` change. Returns { data, loading, error, reload, setData }. */
export function useApi(fetcher, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: undefined, loading: enabled, error: null });
  const [version, setVersion] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.resolve(fetcherRef.current())
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error) => active && setState((current) => ({ ...current, loading: false, error })));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version, enabled]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const setData = useCallback((updater) => setState((current) => ({ ...current, data: typeof updater === 'function' ? updater(current.data) : updater })), []);
  return { ...state, reload, setData };
}

/**
 * List state (page, limit, search, sort, filters) stored in the URL,
 * so lists are shareable and survive refresh/back navigation.
 */
export function useListParams(defaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const base = { page: '1', limit: '10', sortBy: 'createdAt', sortOrder: 'desc', ...defaults };
  const params = { ...base };
  for (const [key, value] of searchParams.entries()) params[key] = value;

  const update = useCallback((changes, { resetPage = true } = {}) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value === '' || value == null || value === base[key]) next.delete(key);
        else next.set(key, String(value));
      }
      if (resetPage && !('page' in changes)) next.delete('page');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSearchParams, JSON.stringify(base)]);

  const toggleSort = useCallback((key) => {
    const order = params.sortBy === key && params.sortOrder === 'asc' ? 'desc' : 'asc';
    update({ sortBy: key, sortOrder: order });
  }, [params.sortBy, params.sortOrder, update]);

  return { params, update, toggleSort, key: JSON.stringify(params) };
}

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

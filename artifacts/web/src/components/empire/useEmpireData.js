import { useCallback, useEffect, useState } from 'react';
import { empireApi } from '@/lib/empireApi.js';

// Loads one empire resource and re-loads it whenever any empire write happens on the page.
export function useEmpire(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await loader()); setError(null); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, deps);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener('empire:changed', load);
    return () => window.removeEventListener('empire:changed', load);
  }, [load]);
  return { data, error, loading, reload: load };
}

export const notifyEmpireChanged = () => window.dispatchEvent(new Event('empire:changed'));

export const useBusinessTypes = () => useEmpire(() => empireApi.types());
export const useOverview = () => useEmpire(() => empireApi.overview());

import { useState, useCallback } from 'react';
import { API_BASE } from '../constants/api';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: false, error: null });

  const fetch_ = useCallback(async (endpoint: string, params?: Record<string, string>) => {
    setState({ data: null, loading: true, error: null });
    try {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      const res = await fetch(`${API_BASE}${endpoint}${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setState({ data: json as T, loading: false, error: null });
      return json as T;
    } catch (err: any) {
      setState({ data: null, loading: false, error: err.message });
      return null;
    }
  }, []);

  return { ...state, fetch: fetch_ };
}

import { useSyncExternalStore } from 'react';
import { parsePublicAvailability, type PublicAvailability } from '../data/availability';

export type CommerceAvailabilityMap = Record<string, PublicAvailability>;
interface AvailabilityState {
  availability: CommerceAvailabilityMap | null;
  loading: boolean;
  error: string | null;
}
const initialState: AvailabilityState = { availability: null, loading: true, error: null };
const revisionKey = 'pod-artwork-availability-revision';
let state = initialState;
let generation = 0;
let controller: AbortController | null = null;
const listeners = new Set<() => void>();
const getSnapshot = () => state;
function update(next: AvailabilityState) {
  state = next;
  for (const listener of listeners) listener();
}
async function refresh() {
  const current = ++generation;
  controller?.abort();
  const requestController = new AbortController();
  controller = requestController;
  // A previous verified read is not a confirmation of the current state.
  update(initialState);
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-commerce-availability`, {
      cache: 'no-store',
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      signal: AbortSignal.any([requestController.signal, AbortSignal.timeout(10000)]),
    });
    if (!response.ok) throw new Error('Availability read failed');
    const availability = parsePublicAvailability(await response.json());
    if (current === generation) update({ availability, loading: false, error: null });
  } catch {
    if (current === generation) update({ availability: null, loading: false, error: 'unavailable' });
  }
}
const onRefresh = () => { void refresh(); };
const onVisible = () => { if (document.visibilityState === 'visible') onRefresh(); };
const onStorage = (event: StorageEvent) => { if (event.key === revisionKey) onRefresh(); };
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener('focus', onRefresh);
    window.addEventListener('pod-availability-updated', onRefresh);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    onRefresh();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener('pod-availability-updated', onRefresh);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
      ++generation;
      controller?.abort();
      state = initialState;
    }
  };
}

// Re-read the server after a confirmed or ambiguous write response.
// The storage event invalidates other tabs; no public state is written locally.
export function invalidateAvailability() {
  window.dispatchEvent(new Event('pod-availability-updated'));
  try { localStorage.setItem(revisionKey, crypto.randomUUID()); } catch { /* Focus refresh remains available. */ }
}

export function useCommerceAvailability(): AvailabilityState {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialState);
}

import { getStoredSession } from './auth';
export async function database<T>(path: string, body?: unknown): Promise<T> {
  const session = getStoredSession();
  if (!session) throw new Error('Please sign in again.');
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.code === '40001' ? 'This record changed. Refresh before saving.' : 'Unable to complete this action. Check your access and try again.');
  }
  return response.json();
}
export interface InventoryItem { artwork_id: string; inventory_status: 'available'|'reserved'|'sold'; updated_at: string }
export interface Commission { lead_id: string; brief: string; quote_cents: number|null; approval: string; deposit_status: string; delivery_date: string|null; stage: string }
export interface Movement { id: string; kind: string; created_at: string; changes: Record<string,unknown> }

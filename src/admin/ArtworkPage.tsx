import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminProfile } from './auth';
import { database } from './pipelineApi';
import { availableWorks } from '../data/artworks';
import { parseInventory, parseInventoryItem, type InventoryItem } from '../data/availability';
import { invalidateAvailability } from '../hooks/useCommerceAvailability';

export default function ArtworkPage({ profile }: { profile: AdminProfile }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const readGeneration = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++readGeneration.current;
    setItems([]);
    const rows = parseInventory(await database<unknown>('artwork_inventory?select=artwork_id,inventory_status,updated_at'));
    if (current === readGeneration.current) setItems(rows);
    return rows;
  }, []);
  useEffect(() => {
    const requests = readGeneration;
    void refresh().catch(() => setError('Availability could not be verified. Please retry.'));
    return () => { ++requests.current; };
  }, [refresh]);

  async function save(item: InventoryItem, status: string) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = parseInventoryItem(await database<unknown>('rpc/pod_set_availability', {
        p_artwork_id: item.artwork_id, p_status: status, p_updated_at: item.updated_at,
      }));
      if (saved.artwork_id !== item.artwork_id || saved.inventory_status !== status) {
        throw new Error('The requested availability was not confirmed. Refresh before retrying.');
      }
      invalidateAvailability();
      const latest = await refresh();
      if (latest.find(row => row.artwork_id === item.artwork_id)?.inventory_status !== status) {
        throw new Error('Availability changed again. Review the latest state before saving.');
      }
      setNotice(`Availability saved: ${status}.`);
    } catch (error) {
      invalidateAvailability();
      setError(error instanceof Error ? error.message : 'Unable to verify this change. Please refresh.');
      // Do not keep displaying an old state as confirmed after an ambiguous write.
      setItems([]);
    } finally {
      writing.current = false; setBusy(false);
    }
  }
  const canEdit = profile.role === 'owner' || profile.role === 'client';
  return <section className="pod-panel">
    <h1>Artwork Availability</h1>
    <p>Approved catalog descriptions stay in place. Confirmed availability changes refresh the public gallery, including other open tabs.</p>
    {error && <p role="alert">{error}</p>}
    <p role="status">{busy ? 'Saving availability…' : notice}</p>
    <button disabled={busy} onClick={() => {
      setError(''); setNotice('');
      void refresh().catch(() => setError('Availability could not be verified. Please retry.'));
    }}>Refresh availability</button>
    {availableWorks.map(work => {
      const item = items.find(row => row.artwork_id === work.id);
      return <article className="pod-card" key={work.id}>
        <h2>{work.title}</h2><p>{item?.inventory_status ?? 'Availability unverified'}</p>
        {canEdit && item && <label>Public availability
          <select aria-label={`${work.title} availability`} value={item.inventory_status} disabled={busy}
            onChange={event => { void save(item, event.target.value); }}>
            <option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option>
          </select>
        </label>}
        {!canEdit && <p>Darcy and Josh manage availability.</p>}
      </article>;
    })}
  </section>;
}

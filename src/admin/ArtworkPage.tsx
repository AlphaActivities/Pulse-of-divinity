import { useEffect, useState } from 'react';
import type { AdminProfile } from './auth';
import { database, type InventoryItem } from './pipelineApi';
import { availableWorks } from '../data/artworks';
export default function ArtworkPage({profile}: {profile: AdminProfile}) {
  const [items,setItems] = useState<InventoryItem[]>([]);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState('');
  const refresh = async () => { setItems([]); try {setItems(await database<InventoryItem[]>('artwork_inventory?select=artwork_id,inventory_status,updated_at'));} catch {setError('Availability could not be verified. Please retry.');} };
  useEffect(()=>{void refresh();},[]);
  async function save(item:InventoryItem,status:string) {
    setBusy(item.artwork_id);setError('');
    try {
      await database('rpc/pod_set_availability',{p_artwork_id:item.artwork_id,p_status:status,p_updated_at:item.updated_at});
      await refresh();
    } catch(e) { setError((e as Error).message); } finally {setBusy('');}
  }
  const canEdit = profile.role==='owner'||profile.role==='client';
  return <section className="pod-panel"><h1>Artwork Availability</h1><p>Public catalog descriptions stay approved. Availability changes are recorded and appear on the gallery after refresh.</p>
    {error&&<p role="alert">{error}</p>}<button onClick={()=>{setError('');void refresh();}}>Refresh availability</button>
    {availableWorks.map(work=>{const item=items.find(i=>i.artwork_id===work.id);return <article className="pod-card" key={work.id}><h2>{work.title}</h2><p>{item?.inventory_status??'Availability unverified'}</p>
      {canEdit&&item&&<label>Public availability<select aria-label={`${work.title} availability`} value={item.inventory_status} disabled={busy===work.id} onChange={e=>void save(item,e.target.value)}>
        <option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select></label>}
      {!canEdit&&<p>Darcy and Josh manage availability.</p>}</article>;})}</section>;
}

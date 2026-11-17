import { useEffect,useState } from 'react';
import { database, type Commission, type InventoryItem, type Movement } from './pipelineApi';
import type { LeadDetail } from './leadsApi';
export default function InquiryPipeline({lead}: {lead:LeadDetail}) {
  const [commission,setCommission]=useState<Commission|null>(null);
  const [history,setHistory]=useState<Movement[]>([]);
  const [availability,setAvailability]=useState('Unverified');
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [saved,setSaved]=useState(false);
  useEffect(()=>{let active=true;
    void Promise.all([
      database<Movement[]>(`lead_events?lead_id=eq.${encodeURIComponent(lead.id)}&order=created_at.desc&limit=30`).then(rows=>{if(active)setHistory(rows);}),
      lead.inquiry_type==='commission'?database<Commission[]>(`commissions?lead_id=eq.${encodeURIComponent(lead.id)}`).then(rows=>{if(active)setCommission(rows[0]??{lead_id:lead.id,brief:lead.message,quote_cents:null,approval:'pending',deposit_status:'not_applicable',delivery_date:null,stage:'brief'});}):Promise.resolve(),
      lead.artwork_id?database<InventoryItem[]>(`artwork_inventory?artwork_id=eq.${encodeURIComponent(lead.artwork_id)}&select=artwork_id,inventory_status,updated_at`).then(rows=>{if(active)setAvailability(rows[0]?.inventory_status??'Unverified');}):Promise.resolve(),
    ]).catch(()=>{if(active)setError('Pipeline data could not be verified. Retry by reopening this record.');});
    return()=>{active=false;};
  },[lead.id,lead.inquiry_type,lead.message,lead.artwork_id,lead.updated_at]);
  const change=(key:keyof Commission,value:unknown)=>{setSaved(false);setCommission(c=>c?{...c,[key]:value}:c);};
  async function save() {if(!commission||busy)return;
    if (['accepted','creating','delivered'].includes(commission.stage) && (commission.approval !== 'approved' || commission.quote_cents === null)) {setError('Approve a quote before accepting or creating this commission.');return;}
    setBusy(true);setError('');
    const {brief,quote_cents,approval,deposit_status,delivery_date,stage}=commission;
    try {setCommission(await database<Commission>('rpc/pod_update_commission',{p_lead_id:lead.id,p_changes:{brief,quote_cents,approval,deposit_status,delivery_date,stage}}));setSaved(true);
      setHistory(await database<Movement[]>(`lead_events?lead_id=eq.${encodeURIComponent(lead.id)}&order=created_at.desc&limit=30`));
    } catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className="pod-panel"><h3>{lead.inquiry_type==='commission'?'Commission Pipeline':'Artwork Pipeline'}</h3>
    {lead.artwork_id&&<p>Current artwork availability: <strong>{availability}</strong></p>}
    {error&&<p role="alert">{error}</p>}
    {commission&&<div className="pod-fields">
      <label>Commission brief<textarea value={commission.brief} maxLength={10000} onChange={e=>change('brief',e.target.value)}/></label>
      <label>Quote (USD)<input type="number" min="0" step="0.01" value={commission.quote_cents===null?'':commission.quote_cents/100} onChange={e=>change('quote_cents',e.target.value===''?null:Math.round(Number(e.target.value)*100))}/></label>
      <label>Approval<select value={commission.approval} onChange={e=>change('approval',e.target.value)}>{['pending','approved','declined'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Deposit record<select value={commission.deposit_status} onChange={e=>change('deposit_status',e.target.value)}>{['not_applicable','pending','received'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Delivery date<input type="date" value={commission.delivery_date??''} onChange={e=>change('delivery_date',e.target.value||null)}/></label>
      <label>Commission stage<select value={commission.stage} onChange={e=>change('stage',e.target.value)}>{['brief','quoted','accepted','creating','delivered','closed'].map(x=><option key={x}>{x}</option>)}</select></label>
      <button disabled={busy} onClick={()=>void save()}>{busy?'Saving…':'Save commission'}</button>{saved&&<p role="status">Commission saved.</p>}
      <p>Deposit is a staff record only. Payments remain separately scoped.</p>
    </div>}
    <h4>Movement History</h4>{history.length===0?<p>No verified movements to show.</p>:<ol>{history.map(event=><li key={event.id}>{new Date(event.created_at).toLocaleString()} · {event.kind}<details><summary>Changes</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(event.changes,null,2)}</pre></details></li>)}</ol>}
  </section>;
}

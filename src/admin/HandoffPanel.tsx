import {useEffect,useState} from 'react';
import {database} from './pipelineApi';
interface Handoff {id:string;state:string;outcome:string|null}
export default function HandoffPanel({leadId}:{leadId:string}){
 const [handoff,setHandoff]=useState<Handoff|null>(null),[outcome,setOutcome]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{void database<Handoff[]>(`concierge_handoffs?lead_id=eq.${encodeURIComponent(leadId)}`).then(rows=>setHandoff(rows[0]??null)).catch(()=>setError('Handoff state could not be verified.'));},[leadId]);
 async function act(action:string){if(!handoff)return;setBusy(true);setError('');try{setHandoff(await database('rpc/pod_handoff_action',{p_id:handoff.id,p_action:action,p_outcome:outcome}));window.dispatchEvent(new Event('pod-record-updated'));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!handoff)return error?<p role="alert">{error}</p>:null;
 return <section className="pod-panel"><h3>Concierge Handoff · {handoff.state}</h3>{error&&<p role="alert">{error}</p>}{handoff.state==='pending'?<button disabled={busy} onClick={()=>void act('claim')}>Claim handoff</button>:handoff.state==='claimed'?<><label>Outcome<textarea value={outcome} maxLength={2000} onChange={e=>setOutcome(e.target.value)}/></label><button disabled={busy||!outcome.trim()} onClick={()=>void act('completed')}>Complete handoff</button><button disabled={busy||!outcome.trim()} onClick={()=>void act('chatbot')}>Return to concierge</button></>:<p>{handoff.outcome}</p>}</section>;
}

import { useCallback,useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { database } from './pipelineApi';
interface Attention {count:number;items:{id:string;kind:string;name:string;follow_up_at:string|null}[]}
export default function AttentionCenter(){
 const [attention,setAttention]=useState<Attention|null>(null);const [open,setOpen]=useState(false);const navigate=useNavigate();
 const refresh=useCallback(async()=>{try{const result=await database<Attention>('rpc/pod_attention',{});setAttention(result);
   const badges=navigator as Navigator & {setAppBadge?:(n:number)=>Promise<void>;clearAppBadge?:()=>Promise<void>};
   await (result.count>0?badges.setAppBadge?.(result.count):badges.clearAppBadge?.());
   window.dispatchEvent(new CustomEvent('pod-attention',{detail:result.count}));
 }catch{setAttention(null);}},[]);
 useEffect(()=>{void refresh();const id=setInterval(()=>void refresh(),60000);const update=()=>void refresh();
 window.addEventListener('focus',update);window.addEventListener('pod-record-updated',update);navigator.serviceWorker?.addEventListener('message',update);
 return()=>{clearInterval(id);window.removeEventListener('focus',update);window.removeEventListener('pod-record-updated',update);navigator.serviceWorker?.removeEventListener('message',update);};},[refresh]);
 return <div className="pod-attention"><button aria-label={attention?`Attention: ${attention.count}`:'Attention unavailable'} aria-expanded={open} onClick={()=>setOpen(!open)}><Bell size={18}/>{attention&&attention.count>0&&<span>{attention.count}</span>}</button>
 {open&&<section className="pod-attention-menu"><h2>Needs Attention</h2><button onClick={()=>void refresh()}>Refresh</button>{!attention?<p>Unable to verify attention.</p>:attention.items.length===0?<p>You’re up to date.</p>:attention.items.map(item=><button key={item.id} onClick={()=>{setOpen(false);navigate(`/leads?lead=${encodeURIComponent(item.id)}`);}}>{item.kind==='handoff'?'Staff handoff':'Collector'} · {item.name}</button>)}</section>}</div>;
}

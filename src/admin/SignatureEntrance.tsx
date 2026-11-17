import {Bell} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
export default function SignatureEntrance({name}:{name:string}){
 const [visible,setVisible]=useState(()=>!sessionStorage.getItem('pod-entrance-played')&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [phase,setPhase]=useState('hold');const [count,setCount]=useState(0);const [target,setTarget]=useState({x:0,y:0,scale:1});const started=useRef(Date.now());
 useEffect(()=>{if(!visible)return;
 const attention=(event:Event)=>setCount((event as CustomEvent<number>).detail);window.addEventListener('pod-attention',attention);
 const fly=window.setTimeout(()=>{const el=document.querySelector<HTMLElement>('[data-pod-brand-target]');const rect=el?.getBoundingClientRect();
 if(rect&&rect.width){setTarget({x:rect.left+rect.width/2-window.innerWidth/2,y:rect.top+rect.height/2-(window.innerHeight*0.38-30),scale:rect.width/124});setPhase('fly');}else setPhase('fade');
 },Math.max(0,4000-(Date.now()-started.current)));
 const fade=window.setTimeout(()=>setPhase('fade'),4820);const finish=window.setTimeout(()=>{setVisible(false);sessionStorage.setItem('pod-entrance-played','1');},5140);
 return()=>{clearTimeout(fly);clearTimeout(fade);clearTimeout(finish);window.removeEventListener('pod-attention',attention);};
 },[visible]);
 if(!visible)return null;
 return <div className={`pod-entrance pod-entrance-${phase}`} aria-hidden="true">
 <div className="pod-flying-logo" style={{transform:phase==='fly'||phase==='fade'?`translate(${target.x}px,${target.y}px) scale(${target.scale})`:'none'}}><img src="/images/admin-logo-mark.webp" alt=""/><span className="pod-sheen"/></div>
 <div className="pod-greeting"><p>Welcome, {name.split(' ')[0]}</p><span className="admin-loading-spinner"/><h2>Your Collector Studio</h2><p className="pod-typed-date">{new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date())}</p>{count>0&&<p className="pod-launch-attention"><Bell size={18} style={{display:'inline'}}/> {count} {count===1?'item needs':'items need'} your attention</p>}</div>
 </div>;
}

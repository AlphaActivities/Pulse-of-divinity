import {useState} from 'react';
import {getStoredSession} from './auth';
export default function BusinessSettings(){const [message,setMessage]=useState('');
 async function dispatch(){const session=getStoredSession();if(!session)return;try{const r=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-delivery`,{method:'POST',headers:{'Content-Type':'application/json',apikey:import.meta.env.VITE_SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`},body:'{}'});if(!r.ok)throw new Error();const data=await r.json();setMessage(`${data.accepted} accepted by providers; ${data.failed} failed. Device receipt must be confirmed separately.`);}catch{setMessage('Delivery unavailable. Check server notification settings.');}}
 return <section className="pod-panel"><h1>Business Settings</h1><p>Owner access · Pulse of Divinity</p><button onClick={()=>void dispatch()}>Deliver pending notifications</button>{message&&<p role="status">{message}</p>}<p>Checkout remains a separate release. Staff invitations and signing keys are managed through the approved Supabase account settings.</p></section>;
}

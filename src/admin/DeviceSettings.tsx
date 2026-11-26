import { useEffect,useState } from 'react';
import { database } from './pipelineApi';
import { getStoredSession, type AdminProfile } from './auth';
interface Device {accepted?:boolean;id:string;label:string;last_seen_at:string;receipt_confirmed_at:string|null}
export interface Preferences {admin_id:string;website_inquiries:boolean;chatbot_handoffs:boolean;follow_ups:boolean}
export interface NotificationTransport {
  settings: () => Promise<{devices:Device[];preferences:Omit<Preferences,'admin_id'>;publicKey:string|null;owner:boolean;team?:{registered:number;confirmed:number}}>;
  change: (action:string, body:object) => Promise<unknown>;
}
export default function DeviceSettings({profile, transport, hasHandoffs=true}: {profile:Pick<AdminProfile,'id'>;transport?:NotificationTransport;hasHandoffs?:boolean}) {
  const [devices,setDevices]=useState<Device[]>([]);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  const [label,setLabel]=useState('My device');const [prefs,setPrefs]=useState<Preferences>({admin_id:profile.id,website_inquiries:true,chatbot_handoffs:true,follow_ups:true});
  const [publicKey,setPublicKey]=useState<string|null>(null);
  const [team,setTeam]=useState<{registered:number;confirmed:number}>();
  const [ready,setReady]=useState(!transport);
  const refresh=async()=>{
    if(transport){
      const data=await transport.settings();
      setDevices(data.devices);setPrefs({admin_id:profile.id,...data.preferences});setPublicKey(data.publicKey);setTeam(data.team);setReady(true);
      return;
    }
const [d,p]=await Promise.all([database<Device[]>('push_devices?select=id,label,last_seen_at,receipt_confirmed_at'),database<Preferences[]>('notification_preferences?select=*')]);setDevices(d);if(p[0])setPrefs(p[0]);};
  useEffect(()=>{void refresh().catch(()=>setMessage('Device settings are unavailable. Please retry.'));},[]);
  async function action(fn:()=>Promise<unknown>){setBusy(true);setMessage('');try{await fn();await refresh();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  async function enable(){
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw new Error('Notifications are not supported in this browser. On iPhone, install from Safari and open the Home Screen app.');
    const key=transport ? publicKey : import.meta.env.VITE_VAPID_PUBLIC_KEY as string|undefined;
    if(!key)throw new Error('Push enrollment is awaiting server configuration.');
    // Permission stays inside the original user gesture.
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw new Error('Notifications were not enabled. You can change permission in your browser or device settings.');
    const registration=await navigator.serviceWorker.ready;
    const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    let subscription = await registration.pushManager.getSubscription();
    const enrolledKey = subscription?.options.applicationServerKey;
    if (subscription && (!enrolledKey || new Uint8Array(enrolledKey).length !== bytes.length ||
        new Uint8Array(enrolledKey).some((byte, index) => byte !== bytes[index]))) {
      if (!await subscription.unsubscribe()) throw new Error('Could not replace this device subscription.');
      subscription = null;
    }
    subscription ??= await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
    const json=subscription.toJSON();
    if(transport) await transport.change('register',{label,subscription:json});
    else await database('rpc/pod_register_device',{p_endpoint:json.endpoint,p_p256dh:json.keys?.p256dh,p_auth:json.keys?.auth,p_label:label});
    setMessage('Device registered. Send a test and confirm that you saw it.');
  }
  async function remove(id:string){
    const device=devices.find(d=>d.id===id);if(!device)return;
    if(transport){await transport.change('remove',{id});setMessage('Device removed from this account.');return;}
    const session=getStoredSession();if(!session)throw new Error('Sign in again.');
    const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/push_devices?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{apikey:import.meta.env.VITE_SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`}});
    if(!response.ok)throw new Error('Could not remove this device.');
    setMessage('Device removed from this account.');
  }
  async function sendTest(id:string){
    if(transport){await transport.change('test',{id});setMessage('Provider accepted the test. Confirm when you see the alert.');return;}
    const session=getStoredSession();if(!session)throw new Error('Sign in again.');
    const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-delivery`,{method:'POST',headers:{'Content-Type':'application/json',apikey:import.meta.env.VITE_SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({device_id:id})});
    const result=await response.json();if(!response.ok||result.accepted!==1)throw new Error('Test was not accepted. Check server configuration and device enrollment.');
    setMessage('Provider accepted the test. Confirm receipt only after you see the notification on that device.');
  }
  async function preference(key:keyof Omit<Preferences,'admin_id'>,value:boolean){
    const next={...prefs,[key]:value};if(transport)await transport.change('preferences',next);else await database('notification_preferences?on_conflict=admin_id',next);setPrefs(next);
  }
  return <section className="pod-panel"><h1>My Settings</h1><p>Install this dashboard from Safari on iPhone, or Chrome on Android and desktop. Notifications are optional and belong to each device and account.</p>
    <label>Device name<input maxLength={80} value={label} onChange={e=>setLabel(e.target.value)}/></label>
    <button disabled={busy || !ready} onClick={()=>void action(enable)}>Enable Notifications</button><button disabled={busy} onClick={()=>void action(refresh)}>Refresh My Devices</button>
    {message&&<p role="status">{message}</p>}
    <h2>Notification Preferences</h2>{(['website_inquiries','chatbot_handoffs','follow_ups'] as const).filter(key=>hasHandoffs || key!=='chatbot_handoffs').map(key=><label key={key}><input type="checkbox" checked={prefs[key]} disabled={busy} onChange={e=>void action(()=>preference(key,e.target.checked))}/>{key.replace(/_/g,' ')}</label>)}
    <h2>My Devices</h2>{devices.length===0&&<p>No registered devices.</p>}{devices.map(device=><article className="pod-card" key={device.id}><h3>{device.label}</h3>{device.last_seen_at&&<p>Last registered: {new Date(device.last_seen_at).toLocaleString()}</p>}<p>{device.receipt_confirmed_at?'Receipt confirmed '+new Date(device.receipt_confirmed_at).toLocaleString():'Receipt not confirmed'}</p>
      <button disabled={busy} onClick={()=>void action(()=>sendTest(device.id))}>Send Test</button><button disabled={busy || Boolean(transport && !device.accepted)} onClick={()=>void action(()=>transport?transport.change('confirm',{id:device.id}):database('rpc/pod_confirm_receipt',{p_device_id:device.id}))}>I saw the alert on this device</button><button disabled={busy} onClick={()=>void action(()=>remove(device.id))}>Remove</button></article>)}
    {team&&<section aria-label="Owner notification administration"><h2>Owner overview</h2><p>{team.registered} registered devices. {team.confirmed} confirmed.</p></section>}
    </section>;
}

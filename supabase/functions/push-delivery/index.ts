import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import webpush from 'npm:web-push@3.6.7';
const stagingOrigin = 'https://divinity-crm-review.gta-alpha-activities.workers.dev';
const productionOrigin = 'https://pulseofdivinity.com';
async function validDispatch(supplied: string | null): Promise<boolean> {
  const expected=Deno.env.get('PUSH_DISPATCH_KEY');
  if(!supplied || !expected || expected.length<32)return false;
  const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [a,b]=await Promise.all([digest(supplied),digest(expected)]);
  let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
Deno.serve(async req=>{
  const origin = req.headers.get('Origin');
  const allowed = origin === stagingOrigin ||
    (origin === productionOrigin && Deno.env.get('PUSH_ALLOW_PRODUCTION_ORIGIN') === 'true');
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'authorization,apikey,content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    ...(allowed && origin ? {'Access-Control-Allow-Origin': origin} : {}),
  };
  if (origin && !allowed) return new Response('{}', {status: 403, headers});
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return new Response('{}',{status:405,headers});
  try {
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const scheduled=await validDispatch(req.headers.get('x-pod-dispatch-key'));
    let actor:{id:string;role:string;active:boolean;project_key:string}|null=null;
    if(!scheduled){
      const token=req.headers.get('Authorization')?.replace(/^Bearer /,'')??'';
      const {data:{user}}=await db.auth.getUser(token);
      if(!user)return new Response('{}',{status:401,headers});
      const {data}=await db.from('admins').select('id,role,active,project_key').eq('auth_user_id',user.id).single();actor=data;
      if(!actor?.active||actor.project_key!=='pulse-of-divinity'||!['owner','client','staff'].includes(actor.role))return new Response('{}',{status:403,headers});
    }
    let body;
    try { body = await req.json(); } catch { return new Response('{}', {status: 400, headers}); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return new Response('{}', {status: 400, headers});
    const isTest=typeof body.device_id==='string';
    if((isTest&&!actor)||(!isTest&&!scheduled&&actor?.role!=='owner'))return new Response('{}',{status:403,headers});
    const testDeviceIds = (Deno.env.get('PUSH_TEST_DEVICE_IDS') ?? '').split(',').map(id => id.trim());
    const testOnly = Deno.env.get('PUSH_ENABLE_BULK') !== 'true';
    const cutoff = Deno.env.get('PUSH_DELIVER_AFTER');
    if (isTest && testOnly && !testDeviceIds.includes(body.device_id)) {
      return new Response(JSON.stringify({error: 'This device is not authorized for staging tests.'}), {status: 403, headers});
    }
    if (!isTest && (testOnly || !cutoff || !Number.isFinite(Date.parse(cutoff)))) {
      return new Response(JSON.stringify({error: 'Scheduled delivery is disabled.'}), {status: 503, headers});
    }
    const publicKey=Deno.env.get('VAPID_PUBLIC_KEY'),privateKey=Deno.env.get('VAPID_PRIVATE_KEY'),subject=Deno.env.get('VAPID_SUBJECT');
    if(!publicKey||!privateKey||!subject)return new Response(JSON.stringify({error:'Notifications are not configured'}),{status:503,headers});
    webpush.setVapidDetails(subject,publicKey,privateKey);
    const {data:devices,error:deviceError}=await (isTest?db.from('push_devices').select('*').eq('id',body.device_id).eq('admin_id',actor!.id):db.from('push_devices').select('*').not('receipt_confirmed_at','is',null));
    if(deviceError)throw deviceError;
    if (!isTest) {
      const {error: queueError} = await db.rpc('pod_queue_followups_after', {p_cutoff: cutoff});
      if (queueError) throw queueError;
    }
    const {data:attentionCount,error:countError}=await db.rpc('pod_pending_count');
    if(countError)throw countError;
    let accepted=0,failed=0;
    for(const device of devices??[]){
      const url=new URL(device.endpoint);
      if(url.protocol!=='https:'||url.port||!(url.hostname==='fcm.googleapis.com'||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.web.push.apple.com')||url.hostname==='updates.push.services.mozilla.com'||url.hostname.endsWith('.push.services.mozilla.com')))continue;
      const {data:preferences}=await db.from('notification_preferences').select('*').eq('admin_id',device.admin_id).maybeSingle();
      const {data:events,error:eventError}=isTest?{data:[],error:null}:await db.rpc('pod_device_events_after',{p_device_id:device.id,p_cutoff:cutoff});
      if(eventError)throw eventError;
      for(const event of isTest?[{id:'test',kind:'device_test',lead_id:null}]:(events??[])){
        if(!isTest&&preferences?.[event.kind]===false)continue;
        if(!isTest){
          const {data:lead}=await db.from('leads').select('status,archived').eq('id',event.lead_id).single();
          if(!lead||lead.archived||['WON','CLOSED'].includes(lead.status))continue;
          if(event.kind==='website_inquiries'&&lead.status!=='NEW')continue;
          if(event.kind==='chatbot_handoffs'){
            const {data:handoff}=await db.from('concierge_handoffs').select('state').eq('lead_id',event.lead_id).single();
            if(!handoff||!['pending','claimed'].includes(handoff.state))continue;
          }
        }
        if(!isTest){
          // A unique delivery row prevents simultaneous dispatches from double sending.
          const {data:claimed,error}=await db.rpc('pod_claim_delivery',{p_event:event.id,p_device:device.id});
          if(error||!claimed)continue;
        }
        try{
          await webpush.sendNotification({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth}},JSON.stringify({kind:isTest?'device_test':event.kind,id:event.lead_id,attention_count:attentionCount,event_id:isTest?null:event.id,title:'Pulse of Divinity',body:isTest?'Device test. Confirm receipt in My Settings.':'A collector update needs your attention.'}),{TTL:300,timeout:10000});
          accepted++;
          if(isTest)await db.from('push_devices').update({last_test_accepted_at:new Date().toISOString(),receipt_confirmed_at:null}).eq('id',device.id);
          if(!isTest)await db.from('push_deliveries').update({status:'accepted'}).eq('event_id',event.id).eq('device_id',device.id);
        }catch(e){
          failed++; const status=(e as {statusCode?:number}).statusCode;
          if(status===404||status===410)await db.from('push_devices').delete().eq('id',device.id);
          else if(!isTest)await db.from('push_deliveries').update({status:'failed'}).eq('event_id',event.id).eq('device_id',device.id);
        }
      }
    }
    return new Response(JSON.stringify({accepted,failed,receipt:'Provider acceptance does not confirm a visible device alert.'}),{headers});
  }catch{return new Response(JSON.stringify({error:'Push delivery failed'}),{status:500,headers});}
});

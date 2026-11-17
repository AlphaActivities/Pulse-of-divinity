import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import webpush from 'npm:web-push@3.6.7';
const headers = {'Access-Control-Allow-Origin':'https://pulseofdivinity.com','Access-Control-Allow-Headers':'authorization,apikey,content-type','Content-Type':'application/json'};
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return new Response('{}',{status:405,headers});
  try {
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token=req.headers.get('Authorization')?.replace(/^Bearer /,'')??'';
    const {data:{user}}=await db.auth.getUser(token);
    if(!user)return new Response('{}',{status:401,headers});
    const {data:actor}=await db.from('admins').select('id,role,active,project_key').eq('auth_user_id',user.id).single();
    if(!actor?.active||actor.project_key!=='pulse-of-divinity'||!['owner','client','staff'].includes(actor.role))return new Response('{}',{status:403,headers});
    const body=await req.json();
    const isTest=typeof body.device_id==='string';
    if(!isTest&&actor.role!=='owner')return new Response('{}',{status:403,headers});
    const publicKey=Deno.env.get('VAPID_PUBLIC_KEY'),privateKey=Deno.env.get('VAPID_PRIVATE_KEY'),subject=Deno.env.get('VAPID_SUBJECT');
    if(!publicKey||!privateKey||!subject)return new Response(JSON.stringify({error:'Notifications are not configured'}),{status:503,headers});
    webpush.setVapidDetails(subject,publicKey,privateKey);
    const {data:devices,error:deviceError}=await (isTest?db.from('push_devices').select('*').eq('id',body.device_id).eq('admin_id',actor.id):db.from('push_devices').select('*'));
    if(deviceError)throw deviceError;
    const {data:events,error:eventError}=await db.from('push_outbox').select('id,kind,lead_id').order('created_at').limit(100);
    if(eventError)throw eventError;
    let accepted=0,failed=0;
    for(const device of devices??[]){
      const url=new URL(device.endpoint);
      if(url.protocol!=='https:'||url.port||!(url.hostname==='fcm.googleapis.com'||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.web.push.apple.com')||url.hostname==='updates.push.services.mozilla.com'||url.hostname.endsWith('.push.services.mozilla.com')))continue;
      const {data:preferences}=await db.from('notification_preferences').select('*').eq('admin_id',device.admin_id).maybeSingle();
      for(const event of isTest?[{id:'test',kind:'device_test',lead_id:null}]:(events??[])){
        if(!isTest&&preferences?.[event.kind]===false)continue;
        if(!isTest){
          // A unique delivery row prevents simultaneous dispatches from double sending.
          const {error}=await db.from('push_deliveries').insert({event_id:event.id,device_id:device.id,status:'sending'});
          if(error)continue;
        }
        try{
          await webpush.sendNotification({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth}},JSON.stringify({kind:isTest?'device_test':event.kind,id:event.lead_id,title:'Pulse of Divinity',body:isTest?'Device test. Confirm receipt in My Settings.':'A collector update needs your attention.'}),{TTL:300});
          accepted++;
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

import webpush from 'web-push';
import { project, publicKey, origin, app, ownerId } from './notification-project.mjs';

const keys = ['website_inquiries', 'chatbot_handoffs', 'follow_ups'];
const headers = {'Cache-Control':'no-store, private', 'X-Content-Type-Options':'nosniff'};
const reply = (body, status=200) => Response.json(body, {status, headers});
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const provider = /^(?:fcm\.googleapis\.com|(?:[a-z0-9-]+\.)*web\.push\.apple\.com|(?:[a-z0-9-]+\.)*push\.services\.mozilla\.com)$/;

function validated(value) {
  const url = new URL(value?.endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !provider.test(url.hostname) ||
      url.href.length > 4096 || !/^[\w-]{87}$/.test(value?.keys?.p256dh) || !/^[\w-]{22}$/.test(value?.keys?.auth)) {
    throw Error('Invalid subscription');
  }
  return {endpoint:url.href, keys:{p256dh:value.keys.p256dh, auth:value.keys.auth}};
}

export async function notifications(request, env, upstream=(...args)=>globalThis.fetch(...args)) {
  const url = new URL(request.url);
  if (url.origin !== origin) return reply({error:'Not found'},404);
  if (request.method !== 'GET' && (request.method !== 'POST' || request.headers.get('Origin') !== origin ||
      !request.headers.get('Content-Type')?.startsWith('application/json'))) return reply({error:'Request rejected'},403);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply({error:'Sign in again.'},401);
  // Workers support manual redirect handling. A redirect response is rejected by each caller.
  const api = (resource, options={}) => upstream('https://'+project+'.supabase.co/'+resource, {
    ...options, headers:{Authorization:authorization, apikey:publicKey, ...options.headers},
    redirect:'manual', signal:AbortSignal.timeout(8000),
  });
  let stage = 'identity';
  try {
    const user = await api(app === 'darcy' ? 'functions/v1/get-me' : 'auth/v1/user');
    if (user.status === 401 || user.status === 403) {
      return reply({error:user.status === 401 ? 'CRM session expired. Open the dashboard and sign in again.' : 'CRM access required.'},user.status);
    }
    if (!user.ok) {
      console.error('Notification identity upstream status', user.status);
      return reply({error:'Cannot verify CRM identity right now. Try again.'},503);
    }
    stage = 'identity response';
    const profile = await user.json();
    if (!uuid.test(profile.id)) return reply({error:'CRM access required.'},403);
    if (app === 'juan') {
      stage = 'admin authorization';
      const admin = await api('rest/v1/admins?select=id&id=eq.'+profile.id);
      if (admin.status === 401 || admin.status === 403) return reply({error:'CRM access required.'},admin.status);
      if (!admin.ok) {
        console.error('Notification authorization upstream status', admin.status);
        return reply({error:'Cannot verify CRM membership right now. Try again.'},503);
      }
      if (!(await admin.json()).some(row => row.id === profile.id)) return reply({error:'CRM access required.'},403);
    }
    const owner = app === 'darcy' ? profile.role === 'owner' : profile.id === ownerId;
    stage = 'device database';
    const db = env.NOTIFICATIONS;
    const path = url.pathname.slice('/api/notifications/'.length);
    const prep = (sql,...args) => args.length ? db.prepare(sql).bind(...args) : db.prepare(sql);
    async function attention() {
      if (app === 'darcy') {
        const res=await api('rest/v1/rpc/pod_attention',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
        if (!res.ok) throw Error('Attention unavailable');
        return (await res.json()).count;
      }
      const res=await api('rest/v1/leads?select=id&status=eq.new', {method:'HEAD',headers:{Prefer:'count=exact'}});
      const count=Number(res.headers.get('Content-Range')?.split('/').at(-1) ?? NaN);
      if (!res.ok || !Number.isSafeInteger(count)) throw Error('Attention unavailable');
      return count;
    }
    let vapid;
    try {vapid=JSON.parse(env.STAGING_VAPID_KEYS);} catch {}
    const configured = /^[\w-]{87}$/.test(vapid?.publicKey) && /^[\w-]{43}$/.test(vapid?.privateKey);
    if (request.method === 'GET') {
      if (path === 'attention') return reply({count:await attention()});
      if (path !== 'settings') return reply({error:'Not found'},404);
      const [devices, prefs, team] = await Promise.all([
        prep('SELECT id,label,tested,confirmed FROM devices WHERE owner=? ORDER BY label',profile.id).all(),
        prep('SELECT data FROM preferences WHERE owner=?',profile.id).first(),
        owner ? prep('SELECT count(*) AS registered, count(confirmed) AS confirmed FROM devices').first() : null,
      ]);
      return reply({devices:devices.results.map(d=>({id:d.id,label:d.label,accepted:Boolean(d.tested&&!d.tested.startsWith('pending:')),receipt_confirmed_at:d.confirmed})),
        preferences:prefs ? JSON.parse(prefs.data) : Object.fromEntries(keys.map(k=>[k,true])),
        publicKey:configured ? vapid.publicKey : null, owner, team});
    }
    const raw = await request.text();
    if (raw.length>8000) return reply({error:'Request too large'},413);
    let body;
    try {body=JSON.parse(raw);} catch {return reply({error:'Invalid request'},400);}
    if (!body || typeof body !== 'object') return reply({error:'Invalid request'},400);
    if (path === 'preferences') {
      const allowed=keys.filter(key=>app==='darcy' || key!=='chatbot_handoffs');
      if (!allowed.every(k=>typeof body[k]==='boolean')) return reply({error:'Invalid preferences'},422);
      const prefs=Object.fromEntries(allowed.map(k=>[k,body[k]]));
      await prep('INSERT INTO preferences(owner,data) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data',profile.id,JSON.stringify(prefs)).run();
      return reply({ok:true});
    }
    if (path === 'current-device') {
      let endpoint;
      try {endpoint = new URL(body.endpoint);} catch {return reply({error:'Invalid device'},422);}
      if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.port ||
          endpoint.href.length > 4096 || !provider.test(endpoint.hostname)) return reply({error:'Invalid device'},422);
      const match=await prep('SELECT id FROM devices WHERE endpoint=? AND owner=?',endpoint.href,profile.id).first();
      return reply({registered:Boolean(match)});
    }
    if (path === 'register') {
      let subscription;
      try {subscription=validated(body.subscription);} catch {return reply({error:'Invalid device subscription'},422);}
      const label=typeof body.label==='string'?body.label.trim():'';
      if (!configured || !label || label.length>80) return reply({error:'Check device name and push configuration.'},422);
      const row=await prep('INSERT INTO devices(id,owner,endpoint,subscription,label) VALUES(?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET subscription=excluded.subscription,label=excluded.label WHERE devices.owner=excluded.owner RETURNING id',
        crypto.randomUUID(),profile.id,subscription.endpoint,JSON.stringify(subscription),label).first();
      return row ? reply({ok:true}) : reply({error:'Device belongs to another account.'},409);
    }
    if (!uuid.test(body.id)) return reply({error:'Invalid device'},422);
    if (path === 'remove') {
      await prep('DELETE FROM devices WHERE id=? AND owner=?',body.id,profile.id).run();
      return reply({ok:true});
    }
    if (path === 'confirm') {
      const row=await prep("UPDATE devices SET confirmed=? WHERE id=? AND owner=? AND tested IS NOT NULL AND tested NOT LIKE 'pending:%' RETURNING id",new Date().toISOString(),body.id,profile.id).first();
      return row ? reply({ok:true}) : reply({error:'Send a successful test first.'},409);
    }
    if (path !== 'test' || !configured) return reply({error:'Test delivery unavailable.'},503);
    const attempt='pending:'+new Date().toISOString();
    const row=await prep('UPDATE devices SET tested=?,confirmed=NULL WHERE id=? AND owner=? AND (tested IS NULL OR substr(tested,-24) < ?) RETURNING subscription',
      attempt,body.id,profile.id,new Date(Date.now()-30000).toISOString()).first();
    if (!row) return reply({error:'Device unavailable. Wait 30 seconds before retrying.'},429);
    const subscription=validated(JSON.parse(row.subscription));
    const count=await attention();
    const push=webpush.generateRequestDetails(subscription,JSON.stringify({kind:'test',id:crypto.randomUUID(),attention_count:count}),{
      TTL:60,vapidDetails:{...vapid,subject:origin},
    });
    const accepted=await upstream(push.endpoint,{method:push.method,headers:push.headers,body:push.body,redirect:'manual',signal:AbortSignal.timeout(8000)});
    await accepted.body?.cancel();
    if (!accepted.ok) return reply({error:'Provider rejected the test. Refresh registration and try again.'},502);
    await prep('UPDATE devices SET tested=? WHERE id=? AND owner=? AND tested=?',new Date().toISOString(),body.id,profile.id,attempt).run();
    return reply({accepted:true});
  } catch (error) {
    const message=error instanceof Error ? error.message : '';
    const reason=/illegal invocation|receiver/i.test(message) ? 'fetch receiver'
      : /timeout|aborted/i.test(message) ? 'network timeout'
      : /redirect/i.test(message) ? 'unexpected redirect'
      : /DNS|resolved|host/i.test(message) ? 'network DNS'
      : /network|fetch|connection/i.test(message) ? 'network transport'
      : error instanceof Error ? error.name : 'unknown';
    console.error('Notification operation failed',stage,reason);
    return reply({error:'Notification service unavailable ('+stage+'). Try again.'},503);
  }
}

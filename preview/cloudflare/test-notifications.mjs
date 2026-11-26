import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createECDH} from 'node:crypto';
import webpush from 'web-push';
import {notifications} from './notifications-api.mjs';
import {origin, app, ownerId} from './notification-project.mjs';

const database = new DatabaseSync(':memory:');
database.exec('CREATE TABLE devices(id TEXT PRIMARY KEY, owner TEXT NOT NULL, endpoint TEXT NOT NULL UNIQUE, subscription TEXT NOT NULL, label TEXT NOT NULL, tested TEXT, confirmed TEXT); CREATE TABLE preferences(owner TEXT PRIMARY KEY,data TEXT NOT NULL)');
function statement(sql,args=[]) {
  return {
    bind:(...parameters)=>statement(sql,parameters),
    first:async()=>database.prepare(sql).get(...args),
    all:async()=>({results:database.prepare(sql).all(...args)}),
    run:async()=>database.prepare(sql).run(...args),
  };
}
const env={STAGING_VAPID_KEYS:JSON.stringify(webpush.generateVAPIDKeys()),NOTIFICATIONS:{prepare:statement}};
const primary=ownerId || '10000000-0000-4000-8000-000000000001';
const alternate='10000000-0000-4000-8000-000000000002';
let sends=0;
const request=async (address,opts)=>{
  const url=new URL(address);
  assert.equal(opts.redirect,'manual');
  const token=opts.headers.Authorization;
  const id=token==='Bearer fixture-client'?alternate:primary;
  if (url.hostname==='web.push.apple.com'){
    assert.equal(opts.redirect,'manual');assert.equal(opts.headers['Content-Encoding'],'aes128gcm');assert.ok(opts.body.byteLength>0);
    sends++;return new Response(null,{status:201});
  }
  if (url.pathname.endsWith('/user') || url.pathname.endsWith('/get-me')) {
    if (token==='Bearer expired') return new Response(null,{status:401});
    if (token==='Bearer redirected') return new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/'}});
    if (token==='Bearer provider-down') return new Response(null,{status:503});
    return Response.json({id,role:id===primary?'owner':'client'});
  }
  if (url.pathname.endsWith('/admins')) return Response.json([{id}]);
  if (url.pathname.endsWith('/pod_attention')) return Response.json({count:3});
  if (url.pathname.endsWith('/leads')) return new Response(null,{headers:{'Content-Range':'*/3'}});
  throw Error('Unexpected request');
};
const call=(path,body,token='fixture-owner',transport=request)=>notifications(new Request(origin+'/api/notifications/'+path,{
  method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),Origin:origin,'Content-Type':'application/json'},
  ...(body?{body:JSON.stringify(body)}:{}),
}),env,transport ?? undefined);
const ecdh=createECDH('prime256v1');ecdh.generateKeys();
const subscription={endpoint:'https://web.push.apple.com/staging-fixture',keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:Buffer.alloc(16).toString('base64url')}};
assert.equal((await call('settings',undefined,'')).status,401);
assert.equal((await call('settings',undefined,'expired')).status,401);
assert.equal((await call('settings',undefined,'provider-down')).status,503);
assert.equal((await call('settings',undefined,'redirected')).status,503);
const nativeFetch=globalThis.fetch;
try {
  globalThis.fetch=function(...args){
    assert.equal(this,globalThis);
    return request(...args);
  };
  const routed=await call('settings',undefined,'fixture-owner',null);
  assert.equal(routed.status,200);
} finally {globalThis.fetch=nativeFetch;}
assert.equal((await call('register',{label:'Fixture',subscription})).status,200);
assert.equal((await call('register',{label:'Other',subscription},'fixture-client')).status,409);
assert.deepEqual(await (await call('current-device',{endpoint:subscription.endpoint})).json(),{registered:true});
assert.deepEqual(await (await call('current-device',{endpoint:subscription.endpoint},'fixture-client')).json(),{registered:false});
assert.equal((await call('current-device',{endpoint:'http://127.0.0.1/'})).status,422);
const settings=await (await call('settings')).json();
assert.equal(settings.team.registered,1);assert.equal(settings.devices.length,1);
const id=settings.devices[0].id;
assert.equal((await (await call('settings',undefined,'fixture-client')).json()).devices.length,0);
assert.equal((await call('confirm',{id})).status,409);
assert.equal((await call('test',{id},'fixture-client')).status,429);
assert.equal((await call('test',{id})).status,200);
assert.equal((await call('test',{id})).status,429);
assert.equal((await call('confirm',{id})).status,200);
assert.equal((await call('register',{label:'Refreshed fixture',subscription})).status,200);
const refreshed=await (await call('settings')).json();
assert.equal(refreshed.devices.length,1);
assert.equal(refreshed.devices[0].id,id);
assert.ok(refreshed.devices[0].receipt_confirmed_at);

const prefs={website_inquiries:false,follow_ups:true,chatbot_handoffs:true};
assert.equal((await call('preferences',prefs)).status,200);
assert.equal((await (await call('settings')).json()).preferences.website_inquiries,false);
assert.deepEqual(await (await call('attention')).json(),{count:3});
assert.equal(sends,1);
console.log(app+': authenticated ownership, enrollment, encrypted test, cooldown, confirmation, preferences, and badge verified');

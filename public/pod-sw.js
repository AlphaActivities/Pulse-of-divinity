/* Dashboard worker: never cache credentials, CRM responses, or submitted forms. */
const CACHE='pod-shell-v1';
const isAdmin=path=>/^\/admin(?:\/|$)/.test(path);
function target(payload){return typeof payload.id==='string'&&/^[0-9a-f-]{36}$/i.test(payload.id)?'/admin/leads?lead='+encodeURIComponent(payload.id):'/admin/leads';}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/app/offline.html','/app/icon-192.png'])));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pod-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method==='GET'&&event.request.mode==='navigate'&&url.origin===self.location.origin&&isAdmin(url.pathname))event.respondWith(fetch(event.request).catch(()=>caches.match('/app/offline.html')));});
self.addEventListener('push',event=>event.waitUntil((async()=>{
 let payload={};try{payload=event.data?.json()??{};}catch{/* Untrusted push data. */}
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 for(const client of windows)if(new URL(client.url).origin===self.location.origin&&isAdmin(new URL(client.url).pathname))client.postMessage({kind:'pod-push-arrived'});
 // Always show user-visible push. Refresh the canonical count on foreground;
 // background counts are included only when the server can verify them.
 if(Number.isSafeInteger(payload.attention_count)&&payload.attention_count>=0){try{if(payload.attention_count>0)await self.navigator.setAppBadge?.(payload.attention_count);else await self.navigator.clearAppBadge?.();}catch{}}
 await self.registration.showNotification('Pulse of Divinity',{body:payload.kind==='device_test'?'Device test. Confirm receipt in My Settings.':'A collector update needs your attention.',icon:'/app/icon-192.png',badge:'/app/icon-192.png',tag:payload.kind==='device_test'?'pod-device-test':'pod-'+(payload.id??'attention'),data:{url:target(payload)}});
})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{
 const raw=event.notification.data?.url;const match=typeof raw==='string'?raw.match(/^\/admin\/leads\?lead=([0-9a-f-]{36})$/i):null;const destination=match?target({id:match[1]}):'/admin/leads';
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const existing=windows.find(c=>new URL(c.url).origin===self.location.origin&&isAdmin(new URL(c.url).pathname));
 if(existing){try{await existing.navigate(destination);await existing.focus();return;}catch{}}
 await self.clients.openWindow(destination);
})());});

export function registerDashboard(){
 if(!/^\/admin(?:\/|$)/.test(location.pathname))return;
 if('serviceWorker' in navigator)void navigator.serviceWorker.register('/pod-sw.js',{scope:'/admin'}).catch(()=>{/* Dashboard remains usable without installation. */});
 // The dedicated admin HTML owns installation metadata before React starts.
 // Deliberate tap feedback where supported; never synthesize permission gestures.
 document.addEventListener('click',event=>{if(event.detail===0||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const element=event.target;
 if(element instanceof Element&&element.closest('.admin-shell button:not(:disabled),.admin-shell a[href]')){try{navigator.vibrate?.(9);}catch{/* Haptics may be unavailable. */}}});
}

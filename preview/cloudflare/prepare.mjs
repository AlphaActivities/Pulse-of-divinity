import {readFileSync,mkdirSync,writeFileSync,rmSync,copyFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
if(createHash('sha256').update(readFileSync('baseline.tar.gz')).digest('hex') !== 'b245e761e83c7198492aa2e546ad2cc55e3ed79f06602c5b932a843246b3c6d9') throw Error('Baseline checksum mismatch');
mkdirSync('baseline',{recursive:true});
execFileSync('tar',['-xzf','baseline.tar.gz','-C','baseline']);

// Retarget only the verified v8 documents and compiled CRM bundle after extraction.
const paths = ['index.html', 'admin/index.html', 'admin/login/index.html', 'admin/leads/index.html', 'assets/main-4UoMFP3-.js'];
for (const path of paths) {
  const file = 'baseline/dist/' + path;
  const source = readFileSync(file, 'utf8');
  if (!source.includes('cozcsqrqoztzuimxnlfr')) throw Error('Unexpected v8 content in ' + path);
  writeFileSync(file, source.replaceAll('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvemNzcXJxb3p0enVpbXhubGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1Nzk1MDYsImV4cCI6MjEwMjE1NTUwNn0.qZWAMDEcQYtZWWHXNPaTT6hsbuhEgIwyYMxBzYBXLhA', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4eHJrd2l0bmNhcmFvdHZreXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4Nzk1ODksImV4cCI6MjExMDQ1NTU4OX0.rY4FD-xtwQYTtgpePecJ6wnceV7r5tDTmz76pPEmdrQ').replaceAll('cozcsqrqoztzuimxnlfr', 'fxxrkwitncaraotvkyte'));
}

// Match Missy's standalone viewport on the private CRM entry documents.
for (const path of ['admin/index.html', 'admin/login/index.html', 'admin/leads/index.html']) {
  const file = 'baseline/dist/' + path;
  const source = readFileSync(file, 'utf8');
  const viewport = ', viewport-fit=cover';
  const statusBar = 'name="apple-mobile-web-app-status-bar-style" content="black-translucent"';
  if (!source.includes(viewport) || !source.includes(statusBar)) {
    throw Error('Unexpected standalone metadata in ' + path);
  }
  writeFileSync(file, source.replace(viewport, '').replace(statusBar, statusBar.replace('black-translucent', 'black')));
}

// The verified v8 CRM already renders live Stripe statuses for owners.
// Explain the unlinked state without offering account creation.
const stripeBundle = 'baseline/dist/assets/main-4UoMFP3-.js';
const stripeSource = readFileSync(stripeBundle, 'utf8');
const stripeGrid = 'v?i.jsxs(i.Fragment,{children:[i.jsxs("div",{className:"admin-stripe-status-grid"';
if (stripeSource.split(stripeGrid).length !== 2) throw Error('Unexpected Stripe status markup');
const stripeSetup = 'v?i.jsxs(i.Fragment,{children:[!v.configured&&i.jsx("p",{className:"admin-stripe-banner",children:"Stripe is not linked. Ask the CRM owner to associate the existing Stripe account, then refresh Stripe status."}),i.jsxs("div",{className:"admin-stripe-status-grid"';
writeFileSync(stripeBundle, stripeSource.replace(stripeGrid, stripeSetup));


// Strip the launch diagnostics from the prebuilt pages before uploading assets.
const launchScript = '<script src="/app/launch-check.js"></script>';
const launchPanel = /<details id="launch-check"[^>]*>[\s\S]*?<\/details>/g;
for (const path of paths.filter((path) => path.endsWith('.html'))) {
  const file = 'baseline/dist/' + path;
  const source = readFileSync(file, 'utf8');
  if (source.split(launchScript).length !== 2 || [...source.matchAll(launchPanel)].length !== 1) {
    throw Error('Unexpected launch diagnostics in ' + path);
  }
  writeFileSync(file, source.replace(launchScript, '').replace(launchPanel, ''));
}
rmSync('baseline/dist/app/launch-check.js');

// Apply the staging lead-status behavior to the pinned v8 assets.
const leadBundle = readFileSync(stripeBundle, 'utf8');
const leadChanges = [
  ['CLOSED:"Closed"}', 'CLOSED:"Closed",ARCHIVED:"Archived"}', 1],
  [
    'id:"detail-status",options:Ng,value:d,onChange:y',
    'id:"detail-status",options:o.archived?[{value:"ARCHIVED",label:"Archived"},{value:"RESTORE",label:"Restore"}]:[...Ng,{value:"ARCHIVED",label:"Archived"}],value:o.archived?"ARCHIVED":d,onChange:(value)=>{if(value==="ARCHIVED"){if(!o.archived)z(!0)}else if(value==="RESTORE"){void gi()}else y(value)}',
    1,
  ],
  ['Qa(w.status)}`,children:Yo(w.status)', 'Qa(w.archived?"ARCHIVED":w.status)}`,children:Yo(w.archived?"ARCHIVED":w.status)', 2],
  [
    'M=()=>{P()};return document.addEventListener("mousedown",A)',
    'M=(event)=>{if(!g.current?.contains(event.target))P()};return document.addEventListener("mousedown",A)',
    1,
  ],
];
let updatedLeadBundle = leadBundle;
for (const [before, after, count] of leadChanges) {
  if (updatedLeadBundle.split(before).length !== count + 1) {
    throw Error('Unexpected v8 lead status markup: ' + before);
  }
  updatedLeadBundle = updatedLeadBundle.replaceAll(before, after);
}
const navLinks = 'children:hg.map(u=>';
const navEnd = '},u.key)})})]}),i.jsxs("div",{className:"admin-header-right"';
if (updatedLeadBundle.split(navLinks).length !== 2 || updatedLeadBundle.split(navEnd).length !== 2) {
  throw Error('Unexpected V8 navigation');
}
updatedLeadBundle = updatedLeadBundle
  .replace(navLinks, 'children:[...hg.map(u=>')
  .replace(navEnd, '},u.key)}),i.jsx("a",{className:"admin-nav-item",href:"/admin/notifications/",children:"Notifications"},"notifications")]})]}),i.jsxs("div",{className:"admin-header-right"');
writeFileSync(stripeBundle, updatedLeadBundle);

 // Ensure status labels and dots share an opaque, readable foreground.
 const statusContrastScript = `<script>(()=>{const colors={archived:'#C4BCCB',restore:'#E5C36A'};const apply=()=>{const trigger=document.getElementById('detail-status');if(!trigger)return;const scope=trigger.parentElement;if(!scope)return;for(const el of [trigger,...scope.querySelectorAll('button,[role="option"]')]){const label=el.textContent.trim().toLowerCase();const color=colors[label];if(!color)continue;el.style.setProperty('color',color,'important');el.style.setProperty('opacity','1','important');for(const child of el.querySelectorAll('span,svg')){child.style.setProperty('color',color,'important');child.style.setProperty('opacity','1','important');if(child.tagName==='SPAN'&&!child.textContent.trim()&&getComputedStyle(child).backgroundColor!=='rgba(0, 0, 0, 0)')child.style.setProperty('background-color',color,'important');}}};const start=()=>{apply();new MutationObserver(apply).observe(document.body,{childList:true,subtree:true,characterData:true});};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();})();</script>`;
 for(const path of ['admin/index.html','admin/login/index.html','admin/leads/index.html']){
   const file='baseline/dist/'+path;
   const source=readFileSync(file,'utf8');
   if(!source.includes('</body>'))throw Error('Missing body close in '+path);
   writeFileSync(file,source.replace('</body>',statusContrastScript+'</body>'));
 }


 // Hide only the redundant standalone Archive action beside Save Changes.
 const standaloneArchiveScript = `<script>(()=>{const apply=()=>{for(const button of document.querySelectorAll('button')){if(button.textContent.trim().toLowerCase()!=='archive')continue;const parent=button.parentElement;if(!parent)continue;const siblings=[...parent.querySelectorAll('button')];if(!siblings.some(b=>b.textContent.trim().toLowerCase()==='save changes'))continue;button.hidden=true;button.style.setProperty('display','none','important');}};const start=()=>{apply();new MutationObserver(apply).observe(document.body,{childList:true,subtree:true,characterData:true});};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();})();</script>`;
 for(const path of ['admin/index.html','admin/login/index.html','admin/leads/index.html']){
   const file='baseline/dist/'+path;
   const source=readFileSync(file,'utf8');
   if(!source.includes('</body>'))throw Error('Missing body close in '+path);
   writeFileSync(file,source.replace('</body>',standaloneArchiveScript+'</body>'));
 }


const crmStyles = 'baseline/dist/assets/main-BpLK6BeW.css';
const styles = readFileSync(crmStyles, 'utf8');
const clippedMenu = 'overflow:hidden;transform-origin:top center;isolation:isolate';
if (styles.split(clippedMenu).length !== 2) throw Error('Unexpected v8 status menu styles');
writeFileSync(crmStyles, styles.replace(clippedMenu, 'height:auto;max-height:none;overflow:visible;transform-origin:top center;isolation:isolate'));

// Give the patched assets content-based URLs so installed dashboards refresh them.
for (const asset of [stripeBundle, crmStyles]) {
  const filename = asset.split('/').at(-1);
  const digest = createHash('sha256').update(readFileSync(asset)).digest('hex').slice(0, 12);
  const updatedFilename = filename.replace(/\.(js|css)$/, `-${digest}.$1`);
  writeFileSync(asset.replace(filename, updatedFilename), readFileSync(asset));
  rmSync(asset);
  for (const path of paths.filter((path) => path.endsWith('.html'))) {
    const file = 'baseline/dist/' + path;
    const source = readFileSync(file, 'utf8');
    if (!source.includes('/assets/' + filename)) throw Error('Missing asset reference in ' + path);
    writeFileSync(file, source.replaceAll('/assets/' + filename, '/assets/' + updatedFilename));
  }
}

// Bundle only notification settings; the reviewed V8 CRM remains the entry point.
execFileSync('../../node_modules/.bin/vite', ['build', '--config', 'notifications.vite.mjs'], {stdio: 'inherit'});
mkdirSync('baseline/dist/admin/notifications', {recursive: true});
renameSync('baseline/dist/notifications.html', 'baseline/dist/admin/notifications/index.html');
copyFileSync('../../public/pod-sw.js', 'baseline/dist/pod-sw.js');
copyFileSync('../../public/app/offline.html', 'baseline/dist/app/offline.html');

const supplied = updatedLeadBundle;
const settingsPage = 'admin/notifications/index.html';

const ref="fxxrkwitncaraotvkyte";
const anon=[...supplied.matchAll(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g)].map(x=>x[0]).find(key=>{
  try {const claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());return claims.ref===ref&&claims.role==='anon';} catch {return false;}
});
if (!anon) throw Error('Missing staging project anon key');
writeFileSync('notification-project.mjs', [
  ['project',ref],['publicKey',anon],['origin',"https://divinity-crm-review.gta-alpha-activities.workers.dev"],['app',"darcy"],['ownerId',null],
].map(([k,v])=>'export const '+k+'='+JSON.stringify(v)+';').join('\n'));
copyFileSync('notification-badge.js','baseline/dist/notification-badge.js');
copyFileSync('notification-nav.css','baseline/dist/notification-nav.css');
for (const path of ['admin/index.html','admin/login/index.html','admin/leads/index.html',settingsPage]) {
  const file='baseline/dist/'+path;
  const html=readFileSync(file,'utf8');
  writeFileSync(file,html.replace('</head>','<link rel="stylesheet" href="/notification-nav.css"></head>')
    .replace('</body>','<script defer src="/notification-badge.js"></script></body>'));
}

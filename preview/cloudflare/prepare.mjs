import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
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


// Remove the temporary staging diagnostics panel from the private CRM documents,
// and keep the lead status menu fully visible on small screens.
const adminDocuments = ['admin/index.html', 'admin/login/index.html', 'admin/leads/index.html'];
const runtimePolish = `<script>
(() => {
  const removeDiagnostics = () => {
    for (const node of document.querySelectorAll('body *')) {
      if (node.children.length) continue;
      const text = node.textContent || '';
      if (!text.includes('Live data') || !text.includes('Launch info')) continue;
      let target = node;
      for (let i = 0; i < 7 && target.parentElement; i++) {
        const parent = target.parentElement;
        if (getComputedStyle(parent).position === 'fixed') { target = parent; break; }
        target = parent;
      }
      target.remove();
    }
  };

  const fitStatusMenu = () => {
    const menu = document.querySelector('.admin-status-select-menu');
    if (!menu) return;
    const trigger = menu.parentElement?.querySelector('.admin-status-select-trigger');
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = menu.scrollHeight;
    const margin = 12;
    const roomBelow = window.innerHeight - rect.bottom - margin;
    if (roomBelow < menuHeight && rect.top > menuHeight + margin) {
      Object.assign(menu.style, {
        position: 'fixed',
        top: Math.max(margin, rect.top - Math.min(menuHeight, window.innerHeight - margin * 2) - 4) + 'px',
        bottom: 'auto',
        left: rect.left + 'px',
        right: 'auto',
        width: rect.width + 'px',
        maxHeight: Math.max(120, Math.min(menuHeight, window.innerHeight - margin * 2)) + 'px',
        overflowY: 'auto',
        zIndex: '10000'
      });
    }
  };

  const observer = new MutationObserver(() => {
    removeDiagnostics();
    requestAnimationFrame(fitStatusMenu);
  });
  const start = () => {
    removeDiagnostics();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', fitStatusMenu, { passive: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
</script>`;

for (const path of adminDocuments) {
  const file = 'baseline/dist/' + path;
  const source = readFileSync(file, 'utf8');
  if (!source.includes('</body>')) throw Error('Missing body close in ' + path);
  if (!source.includes('removeDiagnostics')) {
    writeFileSync(file, source.replace('</body>', runtimePolish + '</body>'));
  }
}

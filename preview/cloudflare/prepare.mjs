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

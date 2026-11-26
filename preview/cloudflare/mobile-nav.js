(() => {
  const mobile = matchMedia('(width < 1024px)');
  let current;
  function mount() {
    const header = document.querySelector('.admin-header');
    if (current?.header === header) return;
    current?.badges.disconnect();
    current?.dialog.remove();
    current = undefined;
    if (!header) return;
    const source = header.querySelector('.admin-nav');
    const left = header.querySelector('.admin-header-left');
    if (!source || !left) return;
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.className = 'pod-mobile-nav-open';
    opener.setAttribute('aria-label', 'Open navigation');
    opener.setAttribute('aria-expanded', 'false');
    opener.setAttribute('aria-controls', 'pod-mobile-nav');
    opener.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
    const dialog = document.createElement('dialog');
    dialog.className = 'pod-mobile-nav';
    dialog.id = 'pod-mobile-nav';
    dialog.setAttribute('aria-labelledby', 'pod-mobile-nav-title');
    dialog.innerHTML = '<div class="pod-mobile-nav-panel"><div class="pod-mobile-nav-top"><h2 id="pod-mobile-nav-title">Pulse of Divinity</h2><button type="button" aria-label="Close navigation" autofocus>×</button></div><nav aria-label="Admin navigation"></nav></div>';
    const menu = dialog.querySelector('nav');
    const close = dialog.querySelector('button');
    const observed = new Map();
    function mirror() {
      for (const [original, link] of observed) {
        const aria = original.getAttribute('aria-current');
        if (aria) link.setAttribute('aria-current', aria);
        else if (original.classList.contains('active') || (original instanceof HTMLAnchorElement &&
          original.pathname.replace(/\/$/,'') === location.pathname.replace(/\/$/,''))) link.setAttribute('aria-current','page');
        else link.removeAttribute('aria-current');
        const count = original.dataset.attention;
        if (count) link.dataset.attention = count;
        else delete link.dataset.attention;
      }
    }
    function open() {
      if (!mobile.matches || dialog.open) return;
      observed.clear();
      menu.replaceChildren();
      for (const original of source.querySelectorAll('button, a[href]')) {
        const link = original.cloneNode(true);
        link.removeAttribute('id');
        if (link instanceof HTMLAnchorElement && link.pathname.startsWith('/admin/notifications') && !link.querySelector('svg')) {
          link.insertAdjacentHTML('afterbegin','<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/></svg>');
        }
        link.addEventListener('click', event => {
          event.preventDefault();
          dialog.close();
          original.click();
        });
        observed.set(original, link);
        menu.append(link);
      }
      mirror();
      opener.setAttribute('aria-expanded','true');
      dialog.showModal();
    }
    opener.addEventListener('click', open);
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      opener.setAttribute('aria-expanded','false');
      if (mobile.matches) opener.focus();
    });
    left.prepend(opener);
    document.body.append(dialog);
    const badges = new MutationObserver(() => { if (dialog.open) mirror(); });
    badges.observe(source,{attributes:true,subtree:true,attributeFilter:['data-attention','aria-current','class']});
    current = {header,dialog,mirror,badges};
  }
  new MutationObserver(() => {
    mount();
    if (current?.dialog.open) current.mirror();
  }).observe(document.body,{childList:true,subtree:true});
  mobile.addEventListener('change', () => {
    if (!mobile.matches && current?.dialog.open) current.dialog.close();
  });
  mount();
})();

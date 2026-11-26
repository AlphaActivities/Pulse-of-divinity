(() => {
  const darcy = location.hostname.startsWith('divinity-');
  const key = darcy ? 'pod_admin_session' : 'sb-nlqsvzbtbspflyozrvds-auth-token';
  const refresh = async () => {
    try {
      const session = JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || 'null');
      if (!session?.access_token) { await navigator.clearAppBadge?.(); return; }
      const response = await fetch('/api/notifications/attention', {
        headers: {Authorization: 'Bearer ' + session.access_token}, cache:'no-store',
      });
      if (response.status === 401 || response.status === 403) { await navigator.clearAppBadge?.(); return; }
      if (!response.ok) return;
      const {count} = await response.json();
      if (!Number.isSafeInteger(count) || count < 0) return;
      if (count) await navigator.setAppBadge?.(count); else await navigator.clearAppBadge?.();
      const indicator = document.getElementById('notification-attention-count');
      if (indicator) indicator.textContent = 'CRM attention count: ' + count;
      const styles = darcy ? '.admin-nav' : 'aside';
      for (const link of document.querySelectorAll(styles+' a[href^="/admin/settings"],'+styles+' a[href^="/admin/notifications"]')) {
        if (count) link.dataset.attention = String(count); else delete link.dataset.attention;
        link.setAttribute('aria-label', count ? 'Settings, '+count+' alerts' : 'Settings');
      }
    } catch { /* Keep the last verified count on network failure. */ }
  };
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.register(darcy ? '/pod-sw.js' : '/notifications-sw.js', {scope:'/admin/'}).catch(() => {});
    navigator.serviceWorker.addEventListener('message', refresh);
  }
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => {if (!document.hidden) void refresh();});
  setInterval(() => {if (!document.hidden) void refresh();}, 15000);
  void refresh();
})();

import { createRoot } from 'react-dom/client';
import DeviceSettings from '../../src/admin/DeviceSettings';
import { fetchAdminProfile, getStoredSession, refreshSession } from '../../src/admin/auth';
import './notifications.css';
import { notificationTransport } from './notification-transport';

const root = createRoot(document.getElementById('notifications')!);
const back = <a href="/admin/">Back to CRM</a>;

async function openSettings() {
  root.render(<>{back}<p role="status">Checking CRM access…</p></>);
  let session = getStoredSession();
  if (session && session.expires_at <= Date.now() / 1000 + 60) {
    session = (await refreshSession(session.refresh_token)).session;
  }
  const profile = session ? (await fetchAdminProfile(session.access_token)).profile : null;
  if (!profile) {
    root.render(<>{back}<p>Sign in to the CRM to manage notifications.</p></>);
    return;
  }
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.register('/pod-sw.js', {scope: '/admin/'}).catch(() => {});
  }
  root.render(<>{back}<DeviceSettings profile={profile} transport={notificationTransport(() => getStoredSession()?.access_token)}/></>);
}

void openSettings().catch(() => root.render(<>{back}<p>Unable to open notification settings. Try again.</p></>));

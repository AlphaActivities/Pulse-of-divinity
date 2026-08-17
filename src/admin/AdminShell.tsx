import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogOut } from 'lucide-react';
import { logout, getStoredSession, clearSession } from './auth';
import type { AdminProfile } from './auth';

interface Props {
  profile: AdminProfile;
  onLogout: () => void;
}

export default function AdminShell({ profile, onLogout }: Props) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    const session = getStoredSession();
    if (session) {
      await logout(session.access_token);
    } else {
      clearSession();
    }
    setLoggingOut(false);
    onLogout();
    navigate('/admin/login', { replace: true });
  };

  useEffect(() => {
    const handlePopState = () => {
      const session = getStoredSession();
      if (!session) {
        onLogout();
        navigate('/admin/login', { replace: true });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate, onLogout]);

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-brand">
            <span className="admin-brand-name">Pulse of Divinity</span>
            <span className="admin-brand-separator">—</span>
            <span className="admin-brand-section">Admin</span>
          </div>
        </div>
        <div className="admin-header-right">
          <div className="admin-user-info">
            <span className="admin-user-label">Signed in as</span>
            <span className="admin-user-name">{profile.display_name}</span>
          </div>
          <button
            className="admin-btn-logout"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Logout"
          >
            <LogOut size={15} strokeWidth={1.8} />
            <span>{loggingOut ? 'Signing out...' : 'Logout'}</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-welcome">
          <div className="admin-welcome-icon">
            <Lock size={28} strokeWidth={1.2} />
          </div>
          <h1 className="admin-welcome-heading">
            Secure Admin Access Confirmed
          </h1>
          <div className="admin-welcome-divider" />
          <p className="admin-welcome-text">
            Welcome, {profile.display_name}. Your admin session is active and authorized.
          </p>
          <p className="admin-welcome-subtext">
            Collector Intelligence Dashboard functionality will arrive in the next phase.
          </p>
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users } from 'lucide-react';
import { logout, getStoredSession, clearSession } from './auth';
import type { AdminProfile } from './auth';

interface Props {
  profile: AdminProfile;
  onLogout: () => void;
  children?: React.ReactNode;
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { key: 'leads', label: 'Leads', icon: Users, path: '/admin/leads' },
] as const;

export default function AdminShell({ profile, onLogout, children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);

  const activePage =
    location.pathname === '/admin' || location.pathname === '/admin/'
      ? 'dashboard'
      : location.pathname.startsWith('/admin/leads')
        ? 'leads'
        : 'dashboard';

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
            <img
              src="/images/admin-logo-mark.webp"
              alt=""
              aria-hidden="true"
              className="admin-brand-logo"
              width="24"
              height="24"
            />
            <span className="admin-brand-name">Pulse of Divinity</span>
            <span className="admin-brand-separator">—</span>
            <span className="admin-brand-section">Admin</span>
          </div>
          <nav className="admin-nav" aria-label="Admin navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.key;
              return (
                <button
                  key={item.key}
                  className={`admin-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={14} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
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

      <main className="admin-main admin-main-with-nav">
        {children}
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import AdminLogin from './AdminLogin';
import AdminShell from './AdminShell';
import LeadsPage from './LeadsPage';
import DashboardHome from './DashboardHome';
import LeadDetailDrawer from './LeadDetailDrawer';
import { getStoredSession, clearSession, fetchAdminProfile } from './auth';
import type { AdminProfile } from './auth';

export default function AdminApp() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [dashboardLeadId, setDashboardLeadId] = useState<string | null>(null);
  const location = useLocation();

  const verifySession = useCallback(async () => {
    const session = getStoredSession();
    if (!session) {
      setProfile(null);
      setLoading(false);
      return false;
    }

    const { profile: adminProfile, error, status } = await fetchAdminProfile(
      session.access_token
    );

    if (status === 401 || status === 403) {
      clearSession();
      setProfile(null);
      setLoading(false);
      return false;
    }

    if (error || !adminProfile) {
      setProfile(null);
      setLoading(false);
      return false;
    }

    setProfile(adminProfile);
    setLoading(false);
    return true;
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const handleLoginSuccess = (newProfile: AdminProfile) => {
    setProfile(newProfile);
    setJustLoggedIn(true);
  };

  const handleLogout = () => {
    setProfile(null);
    setJustLoggedIn(false);
  };

  const handleDashboardRevealed = () => {
    setJustLoggedIn(false);
  };

  if (loading) {
    return (
      <div className="admin-loading-screen admin-verify-screen">
        <div className="admin-verify-content">
          <img
            src="/images/admin-logo-mark.webp"
            alt=""
            aria-hidden="true"
            className="admin-verify-logo"
            width="62"
            height="62"
          />
          <div className="admin-verify-divider" />
          <div className="admin-loading-spinner" />
          <p className="admin-loading-text">Verifying Session</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Routes>
        <Route path="login" element={<AdminLogin onSuccess={handleLoginSuccess} skipEntrance={false} />} />
        <Route path="*" element={<Navigate to="login" replace state={{ from: location.pathname }} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="login" element={<Navigate to="/" replace />} />
      <Route
        element={
          <AdminShell profile={profile} onLogout={handleLogout}>
            <Outlet />
          </AdminShell>
        }
      >
        <Route
          path="/"
          element={
            <>
              <DashboardHome
                profile={profile}
                onLeadClick={(id) => setDashboardLeadId(id)}
                justLoggedIn={justLoggedIn}
                onRevealed={handleDashboardRevealed}
              />
              {dashboardLeadId && (
                <LeadDetailDrawer
                  leadId={dashboardLeadId}
                  onClose={() => setDashboardLeadId(null)}
                  onLeadUpdated={() => {}}
                  onLeadArchived={() => setDashboardLeadId(null)}
                  onLeadRestored={() => {}}
                />
              )}
            </>
          }
        />
        <Route path="leads" element={<LeadsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function AdminRouter() {
  return (
    <BrowserRouter basename="/admin">
      <AdminApp />
    </BrowserRouter>
  );
}

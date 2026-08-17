import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import AdminShell from './AdminShell';
import LeadsPage from './LeadsPage';
import DashboardHome from './DashboardHome';
import LeadDetailDrawer from './LeadDetailDrawer';
import { getStoredSession, clearSession, fetchAdminProfile } from './auth';
import type { AdminProfile } from './auth';
import { fetchAdminOptions } from './leadsApi';
import type { AdminOption } from './leadsApi';

export default function AdminApp() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [dashboardLeadId, setDashboardLeadId] = useState<string | null>(null);
  const location = useLocation();

  const verifySession = useCallback(async () => {
    const session = getStoredSession();
    if (!session) {
      setProfile(null);
      setLoading(false);
      return false;
    }

    const { profile: adminProfile, error, status } = await fetchAdminProfile(session.access_token);

    if (status === 401) {
      clearSession();
      setProfile(null);
      setLoading(false);
      return false;
    }

    if (status === 403) {
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

  useEffect(() => {
    if (profile) {
      const session = getStoredSession();
      if (session) {
        fetchAdminOptions(session.access_token).then(({ data }) => {
          if (data) setAdmins(data);
        });
      }
    }
  }, [profile]);

  const handleLoginSuccess = (newProfile: AdminProfile) => {
    setProfile(newProfile);
  };

  const handleLogout = () => {
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="admin-loading-screen">
        <div className="admin-loading-spinner" />
        <p className="admin-loading-text">Verifying session...</p>
      </div>
    );
  }

  const guard = (element: React.ReactNode) =>
    profile ? (
      element
    ) : (
      <Navigate to="login" replace state={{ from: location.pathname }} />
    );

  return (
    <Routes>
      <Route
        path="login"
        element={
          profile ? (
            <Navigate to="/admin" replace />
          ) : (
            <AdminLogin onSuccess={handleLoginSuccess} />
          )
        }
      />
      <Route
        path="/"
        element={guard(
          <AdminShell profile={profile!} onLogout={handleLogout} activePage="dashboard">
            <DashboardHome profile={profile!} onLeadClick={(id) => setDashboardLeadId(id)} />
            {dashboardLeadId && (
              <LeadDetailDrawer
                leadId={dashboardLeadId}
                admins={admins}
                onClose={() => setDashboardLeadId(null)}
                onLeadUpdated={() => {}}
                onLeadArchived={() => setDashboardLeadId(null)}
                onLeadRestored={() => {}}
              />
            )}
          </AdminShell>
        )}
      />
      <Route
        path="leads"
        element={guard(
          <AdminShell profile={profile!} onLogout={handleLogout} activePage="leads">
            <LeadsPage />
          </AdminShell>
        )}
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
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

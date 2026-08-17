import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import AdminShell from './AdminShell';
import { getStoredSession, clearSession, fetchAdminProfile } from './auth';
import type { AdminProfile } from './auth';

export default function AdminApp() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
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
        path="/admin"
        element={
          profile ? (
            <AdminShell profile={profile} onLogout={handleLogout} />
          ) : (
            <Navigate
              to="/admin/login"
              replace
              state={{ from: location.pathname }}
            />
          )
        }
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export function AdminRouter() {
  return (
    <BrowserRouter>
      <AdminApp />
    </BrowserRouter>
  );
}

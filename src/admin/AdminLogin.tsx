import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithPassword, requestPasswordReset } from './auth';
import type { AdminProfile } from './auth';

interface Props {
  onSuccess: (profile: AdminProfile) => void;
}

export default function AdminLogin({ onSuccess }: Props) {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { session, error: loginError } = await loginWithPassword(email, password);

    if (loginError || !session) {
      setError(loginError || 'Login failed');
      setLoading(false);
      return;
    }

    const { profile, error: profileError } = await fetchAdminProfileInline(session.access_token);

    if (profileError || !profile) {
      setError(profileError || 'Access denied');
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess(profile);
    navigate('/admin', { replace: true });
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await requestPasswordReset(email);

    setLoading(false);
    if (resetError) {
      setError(resetError);
      return;
    }
    setResetSent(true);
  };

  if (resetSent) {
    return (
      <div className="admin-auth-container">
        <div className="admin-auth-card">
          <div className="admin-auth-header">
            <p className="admin-auth-eyebrow">Pulse of Divinity</p>
            <h1 className="admin-auth-title">Check Your Email</h1>
            <div className="admin-auth-divider" />
          </div>
          <p className="admin-reset-confirmation">
            If an account exists for that email address, a password reset link has been sent.
          </p>
          <button
            className="admin-btn-secondary"
            onClick={() => {
              setResetSent(false);
              setResetMode(false);
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-auth-container">
      <div className="admin-auth-card">
        <div className="admin-auth-header">
          <p className="admin-auth-eyebrow">Pulse of Divinity</p>
          <h1 className="admin-auth-title">
            {resetMode ? 'Reset Password' : 'Admin Access'}
          </h1>
          <div className="admin-auth-divider" />
        </div>

        {!resetMode ? (
          <form onSubmit={handleLogin} className="admin-auth-form" autoComplete="on">
            <div className="admin-field-group">
              <label htmlFor="admin-email" className="admin-field-label">
                Email
              </label>
              <input
                ref={emailRef}
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="admin-field-input"
                disabled={loading}
              />
            </div>

            <div className="admin-field-group">
              <label htmlFor="admin-password" className="admin-field-label">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="admin-field-input"
                disabled={loading}
              />
            </div>

            {error && (
              <div role="alert" className="admin-auth-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="admin-btn-primary"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              type="button"
              className="admin-link-button"
              onClick={() => {
                setError(null);
                setResetMode(true);
              }}
              disabled={loading}
            >
              Forgot Password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="admin-auth-form">
            <div className="admin-field-group">
              <label htmlFor="reset-email" className="admin-field-label">
                Email
              </label>
              <input
                ref={emailRef}
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="admin-field-input"
                disabled={loading}
                placeholder="your@email.com"
              />
            </div>

            {error && (
              <div role="alert" className="admin-auth-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="admin-btn-primary"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              className="admin-link-button"
              onClick={() => {
                setError(null);
                setResetMode(false);
              }}
              disabled={loading}
            >
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

async function fetchAdminProfileInline(
  token: string
): Promise<{ profile: AdminProfile | null; error: string | null }> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) return { profile: null, error: 'Authentication required' };
    if (res.status === 403) return { profile: null, error: 'Access denied — not an approved admin' };
    if (!res.ok) return { profile: null, error: 'Failed to verify admin access' };

    const data = await res.json();
    return { profile: data as AdminProfile, error: null };
  } catch {
    return { profile: null, error: 'Network error' };
  }
}

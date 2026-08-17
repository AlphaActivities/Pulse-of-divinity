import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithPassword, requestPasswordReset } from './auth';
import type { AdminProfile } from './auth';

interface Props {
  onSuccess: (profile: AdminProfile) => void;
  skipEntrance: boolean;
}

const ENTRANCE_DURATION = 2000;
const SUCCESS_TRANSITION_DURATION = 1100;

export default function AdminLogin({ onSuccess, skipEntrance }: Props) {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [entranceComplete, setEntranceComplete] = useState(skipEntrance);
  const [authTransitioning, setAuthTransitioning] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    if (!skipEntrance) {
      entranceTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setEntranceComplete(true);
          emailRef.current?.focus();
        }
      }, ENTRANCE_DURATION);
    } else {
      emailRef.current?.focus();
    }

    return () => {
      mountedRef.current = false;
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
      if (entranceTimerRef.current) {
        clearTimeout(entranceTimerRef.current);
        entranceTimerRef.current = null;
      }
    };
  }, [skipEntrance]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { session, error: loginError } = await loginWithPassword(email, password);

    if (loginError || !session) {
      if (mountedRef.current) {
        setError(loginError || 'Login failed');
        setLoading(false);
      }
      return;
    }

    const { profile, error: profileError } = await fetchAdminProfileInline(session.access_token);

    if (profileError || !profile) {
      if (mountedRef.current) {
        setError(profileError || 'Access denied');
        setLoading(false);
      }
      return;
    }

    if (!mountedRef.current) return;

    setLoading(false);
    setAuthTransitioning(true);
    onSuccess(profile);

    successTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        navigate('/admin', { replace: true });
      }
    }, SUCCESS_TRANSITION_DURATION);
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

  if (authTransitioning) {
    return (
      <div className="admin-auth-container admin-auth-transitioning" aria-hidden="true">
        <div className="admin-auth-success-overlay" />
        <div className="admin-auth-card admin-auth-card-dissolving">
          <div className="admin-auth-header">
            <img
              src="/images/admin-logo-small.webp"
              alt=""
              aria-hidden="true"
              className="admin-auth-logo"
              width="73"
              height="73"
            />
            <p className="admin-auth-eyebrow">Pulse of Divinity</p>
            <h1 className="admin-auth-title">Welcome</h1>
            <div className="admin-auth-divider" />
          </div>
        </div>
      </div>
    );
  }

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

  const entranceClass = skipEntrance
    ? ''
    : entranceComplete
      ? 'admin-entrance-done'
      : 'admin-entrance-active';

  const formLocked = !skipEntrance && !entranceComplete;

  return (
    <div className={`admin-auth-container admin-entrance-container ${entranceClass}`}>
      <div className="admin-entrance-overlay" aria-hidden="true" />

      <div className="admin-auth-card admin-entrance-card">
        <div className="admin-auth-header">
          <img
            src="/images/admin-logo-small.webp"
            alt="Pulse of Divinity"
            className="admin-auth-logo"
            width="73"
            height="73"
          />
          <p className="admin-auth-eyebrow">Pulse of Divinity</p>
          <h1 className="admin-auth-title">
            {resetMode ? 'Reset Password' : 'Admin Access'}
          </h1>
          <div className="admin-auth-divider admin-entrance-divider" />
        </div>

        {!resetMode ? (
          <form
            onSubmit={handleLogin}
            className="admin-auth-form admin-entrance-form"
            autoComplete="on"
            style={formLocked ? { pointerEvents: 'none' } : undefined}
            aria-hidden={formLocked ? true : undefined}
          >
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
                disabled={loading || formLocked}
                tabIndex={formLocked ? -1 : 0}
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
                disabled={loading || formLocked}
                tabIndex={formLocked ? -1 : 0}
              />
            </div>

            {error && (
              <div role="alert" className="admin-auth-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`admin-btn-primary ${loading ? 'admin-btn-loading' : ''}`}
              disabled={loading || formLocked}
            >
              {loading ? (
                <span className="admin-btn-shimmer" aria-label="Signing in">
                  <span className="admin-btn-shimmer-text">Signing in</span>
                  <span className="admin-btn-shimmer-sweep" />
                </span>
              ) : (
                'Sign In'
              )}
            </button>

            <button
              type="button"
              className="admin-link-button"
              onClick={() => {
                setError(null);
                setResetMode(true);
              }}
              disabled={loading || formLocked}
              tabIndex={formLocked ? -1 : 0}
            >
              Forgot Password?
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleReset}
            className="admin-auth-form"
          >
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

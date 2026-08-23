import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithPassword, requestPasswordReset, clearSession } from './auth';
import type { AdminProfile } from './auth';

interface Props {
  onSuccess: (profile: AdminProfile) => void;
  skipEntrance: boolean;
}

const SUCCESS_TRANSITION_DURATION = 1100;
const PROFILE_TIMEOUT_MS = 12000;

export default function AdminLogin({ onSuccess }: Props) {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const passwordRef = useRef<HTMLInputElement>(null);
  const autoLoginAttemptedRef = useRef(false);
  const autoLoginTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [authTransitioning, setAuthTransitioning] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    emailRef.current?.focus();

    return () => {
      mountedRef.current = false;
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
      if (autoLoginTimerRef.current) {
        clearTimeout(autoLoginTimerRef.current);
        autoLoginTimerRef.current = null;
      }
    };
  }, []);

  const handleAutofillDetected = () => {
    if (autoLoginAttemptedRef.current || loading) return;
    if (autoLoginTimerRef.current) clearTimeout(autoLoginTimerRef.current);
    autoLoginTimerRef.current = setTimeout(() => {
      if (autoLoginAttemptedRef.current || !mountedRef.current || loading) return;
      const emailValue = emailRef.current?.value ?? '';
      const passwordValue = passwordRef.current?.value ?? '';
      if (!emailValue || !passwordValue) return;
      autoLoginAttemptedRef.current = true;
      setEmail(emailValue);
      setPassword(passwordValue);
      autoLoginTimerRef.current = setTimeout(() => {
        if (!mountedRef.current || loading) return;
        emailRef.current?.form?.requestSubmit();
      }, 50);
    }, 150);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const { session, error: loginError } = await loginWithPassword(email, password);

      if (loginError || !session) {
        if (mountedRef.current) {
          setError(loginError || 'Invalid email or password.');
          setLoading(false);
        }
        return;
      }

      const { profile, error: profileError } = await fetchAdminProfileInline(
        session.access_token
      );

      if (profileError || !profile) {
        clearSession();
        if (mountedRef.current) {
          setError(profileError || 'Your account is not authorized for admin access.');
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
          navigate('/', { replace: true });
        }
      }, SUCCESS_TRANSITION_DURATION);
    } catch {
      if (mountedRef.current) {
        setError('Unable to connect. Please try again.');
        setLoading(false);
      }
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const { error: resetError } = await requestPasswordReset(email);

      if (resetError) {
        if (mountedRef.current) {
          setError(resetError);
          setLoading(false);
        }
        return;
      }
      if (mountedRef.current) {
        setResetSent(true);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) {
        setError('Unable to connect. Please try again.');
        setLoading(false);
      }
    }
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

  return (
    <div className="admin-auth-container">
      <div className="admin-auth-card">
        <div className="admin-auth-header">
          <img
            src="/images/admin-logo-small.webp"
            alt="Pulse of Divinity"
            className="admin-auth-logo admin-reveal-logo"
            width="73"
            height="73"
          />
          <p className="admin-auth-eyebrow admin-reveal-eyebrow">Pulse of Divinity</p>
          <h1 className="admin-auth-title admin-reveal-title">
            {resetMode ? 'Reset Password' : 'Admin Access'}
          </h1>
          <div className="admin-auth-divider admin-reveal-divider" />
        </div>

        {!resetMode ? (
          <form
            onSubmit={handleLogin}
            className="admin-auth-form"
            autoComplete="on"
          >
            <div className="admin-field-group admin-reveal-field-1">
              <label htmlFor="admin-email" className="admin-field-label">
                Email
              </label>
              <input
                ref={emailRef}
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onAnimationStart={(e) => {
                  if (e.animationName === 'adminAutofillDetect') handleAutofillDetected();
                }}
                required
                autoComplete="username"
                className="admin-field-input"
                disabled={loading}
              />
            </div>

            <div className="admin-field-group admin-reveal-field-2">
              <label htmlFor="admin-password" className="admin-field-label">
                Password
              </label>
              <input
                ref={passwordRef}
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onAnimationStart={(e) => {
                  if (e.animationName === 'adminAutofillDetect') handleAutofillDetected();
                }}
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
              className={`admin-btn-primary admin-reveal-submit ${loading ? 'admin-btn-loading' : ''}`}
              disabled={loading}
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
              className="admin-link-button admin-reveal-link"
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
          <form
            onSubmit={handleReset}
            className="admin-auth-form"
          >
            <div className="admin-field-group admin-reveal-field-1">
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
              className="admin-btn-primary admin-reveal-submit"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              className="admin-link-button admin-reveal-link"
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROFILE_TIMEOUT_MS);

    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.status === 401) return { profile: null, error: 'Authentication required' };
    if (res.status === 403) return { profile: null, error: 'Your account is not authorized for admin access.' };
    if (!res.ok) return { profile: null, error: 'Failed to verify admin access' };

    const data = await res.json();
    return { profile: data as AdminProfile, error: null };
  } catch {
    return { profile: null, error: 'Unable to connect. Please try again.' };
  }
}

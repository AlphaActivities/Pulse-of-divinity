import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithPassword, requestPasswordReset, clearSession } from './auth';
import type { AdminProfile } from './auth';

interface Props {
  onSuccess: (profile: AdminProfile) => void;
  skipEntrance: boolean;
}

const SUCCESS_TRANSITION_DURATION = 1100;
const PROFILE_TIMEOUT_MS = 12000;

const AUTOFILL_POLL_INTERVAL_MS = 100;
const AUTOFILL_POLL_DURATION_MS = 15000;

export default function AdminLogin({ onSuccess }: Props) {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const autoLoginAttemptedRef = useRef(false);
  const manualEntryRef = useRef(false);
  const loadingRef = useRef(false);
  const resetModeRef = useRef(false);
  const autofillIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autofillTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmailLenRef = useRef(-1);
  const lastPwLenRef = useRef(-1);

  // Debug panel refs
  const lastEventRef = useRef('MOUNT');
  const requestSubmitCalledRef = useRef(false);
  const handleLoginEnteredRef = useRef(false);
  const emailFocusRef = useRef(false);
  const passwordFocusRef = useRef(false);
  const bothValuesDetectedRef = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [authTransitioning, setAuthTransitioning] = useState(false);
  const [, setDebugTick] = useState(0);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    resetModeRef.current = resetMode;
  }, [resetMode]);

  // Debug panel refresh tick — reads refs only, no behavior change
  useEffect(() => {
    const tick = setInterval(() => setDebugTick((t) => t + 1), 200);
    return () => clearInterval(tick);
  }, []);

  // ── Autofill watcher ──────────────────────────────────────────

  const stopAutofillWatcher = useCallback((reason: string) => {
    if (autofillIntervalRef.current || autofillTimeoutRef.current) {
      console.log(`[POD AUTOLOGIN] WATCHER STOP: ${reason}`);
      lastEventRef.current = `WATCHER STOP: ${reason}`;
    }
    if (autofillIntervalRef.current) {
      clearInterval(autofillIntervalRef.current);
      autofillIntervalRef.current = null;
    }
    if (autofillTimeoutRef.current) {
      clearTimeout(autofillTimeoutRef.current);
      autofillTimeoutRef.current = null;
    }
  }, []);

  // ── Unified autofill check ────────────────────────────────────

  const maybeAutoLogin = useCallback(() => {
    if (!mountedRef.current) return;
    if (loadingRef.current) return;
    if (autoLoginAttemptedRef.current) return;
    if (manualEntryRef.current) return;
    if (resetModeRef.current) return;

    const emailValue = emailRef.current?.value.trim() ?? '';
    const passwordValue = passwordRef.current?.value ?? '';
    const emailLen = emailValue.length;
    const pwLen = passwordValue.length;

    // Log only when observed lengths change
    if (emailLen !== lastEmailLenRef.current || pwLen !== lastPwLenRef.current) {
      console.log('[POD AUTOLOGIN] DOM VALUES CHANGED', { emailLength: emailLen, passwordLength: pwLen });
      lastEmailLenRef.current = emailLen;
      lastPwLenRef.current = pwLen;
    }

    if (!emailValue || !passwordValue) return;

    bothValuesDetectedRef.current = true;
    console.log('[POD AUTOLOGIN] BOTH VALUES PRESENT', {
      mounted: mountedRef.current,
      manualEntry: manualEntryRef.current,
      attempted: autoLoginAttemptedRef.current,
      loading: loadingRef.current,
      resetMode: resetModeRef.current,
    });
    lastEventRef.current = 'BOTH VALUES PRESENT';

    setEmail(emailValue);
    setPassword(passwordValue);

    stopAutofillWatcher('SUBMIT');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!mountedRef.current) {
          console.log('[POD AUTOLOGIN] BLOCKED: UNMOUNTED (rAF)');
          lastEventRef.current = 'BLOCKED: UNMOUNTED (rAF)';
          return;
        }
        if (loadingRef.current) {
          console.log('[POD AUTOLOGIN] BLOCKED: LOADING (rAF)');
          lastEventRef.current = 'BLOCKED: LOADING (rAF)';
          return;
        }
        if (autoLoginAttemptedRef.current) {
          console.log('[POD AUTOLOGIN] BLOCKED: ATTEMPTED (rAF)');
          lastEventRef.current = 'BLOCKED: ATTEMPTED (rAF)';
          return;
        }
        autoLoginAttemptedRef.current = true;
        requestSubmitCalledRef.current = true;
        console.log('[POD AUTOLOGIN] REQUESTSUBMIT CALLED', { formRefPresent: !!formRef.current });
        lastEventRef.current = 'REQUESTSUBMIT CALLED';
        formRef.current?.requestSubmit();
      });
    });
  }, [stopAutofillWatcher]);

  const startAutofillWatcher = useCallback(() => {
    if (!mountedRef.current) return;
    if (manualEntryRef.current || autoLoginAttemptedRef.current) return;
    stopAutofillWatcher('RESTART');
    console.log('[POD AUTOLOGIN] WATCHER START', { duration: AUTOFILL_POLL_DURATION_MS, interval: AUTOFILL_POLL_INTERVAL_MS });
    lastEventRef.current = 'WATCHER START';
    autofillIntervalRef.current = setInterval(() => {
      maybeAutoLogin();
    }, AUTOFILL_POLL_INTERVAL_MS);
    autofillTimeoutRef.current = setTimeout(() => {
      stopAutofillWatcher('TIMEOUT');
    }, AUTOFILL_POLL_DURATION_MS);
  }, [stopAutofillWatcher, maybeAutoLogin]);

  // ── Window event handlers ────────────────────────────────────

  const handleWindowFocus = useCallback(() => {
    if (manualEntryRef.current || autoLoginAttemptedRef.current) return;
    startAutofillWatcher();
  }, [startAutofillWatcher]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) return;
    if (manualEntryRef.current || autoLoginAttemptedRef.current) return;
    startAutofillWatcher();
  }, [startAutofillWatcher]);

  const handlePageshow = useCallback(() => {
    if (manualEntryRef.current || autoLoginAttemptedRef.current) return;
    startAutofillWatcher();
  }, [startAutofillWatcher]);

  // ── Mount: start watcher + window listeners ───────────────────

  useEffect(() => {
    mountedRef.current = true;
    emailRef.current?.focus();
    startAutofillWatcher();
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageshow);

    return () => {
      mountedRef.current = false;
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
      stopAutofillWatcher('UNMOUNT');
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageshow);
    };
  }, [startAutofillWatcher, handleWindowFocus, handleVisibilityChange, handlePageshow, stopAutofillWatcher]);

  // ── Manual entry detection ────────────────────────────────────

  const handleManualPaste = () => {
    manualEntryRef.current = true;
    lastEventRef.current = 'MANUAL PASTE';
    stopAutofillWatcher('MANUAL ENTRY');
  };

  const handleInputFocus = (field: 'email' | 'password') => {
    if (field === 'email') {
      emailFocusRef.current = true;
      console.log('[POD AUTOLOGIN] EMAIL FOCUS');
      lastEventRef.current = 'EMAIL FOCUS';
    } else {
      passwordFocusRef.current = true;
      console.log('[POD AUTOLOGIN] PASSWORD FOCUS');
      lastEventRef.current = 'PASSWORD FOCUS';
    }
    if (manualEntryRef.current || autoLoginAttemptedRef.current || loadingRef.current) return;
    startAutofillWatcher();
  };

  const handleInputBlur = (field: 'email' | 'password') => {
    if (field === 'email') emailFocusRef.current = false;
    else passwordFocusRef.current = false;
  };

  // ── Existing login handler (unchanged) ────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    handleLoginEnteredRef.current = true;
    console.log('[POD AUTOLOGIN] HANDLELOGIN ENTERED');
    lastEventRef.current = 'HANDLELOGIN ENTERED';
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

  const watcherActive = !!autofillIntervalRef.current;
  const currentEmailLen = emailRef.current?.value.trim().length ?? 0;
  const currentPwLen = passwordRef.current?.value.length ?? 0;

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
            ref={formRef}
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
                name="username"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onInput={(e) => {
                  if (manualEntryRef.current) return;
                  const inputType = (e.nativeEvent as InputEvent).inputType ?? '';
                  if (
                    inputType === 'insertText' ||
                    inputType === 'deleteContentBackward' ||
                    inputType === 'deleteContentForward' ||
                    inputType === 'insertFromPaste'
                  ) {
                    manualEntryRef.current = true;
                    lastEventRef.current = `MANUAL INPUT (${inputType})`;
                    stopAutofillWatcher('MANUAL ENTRY');
                    return;
                  }
                  maybeAutoLogin();
                  if (!autoLoginAttemptedRef.current) startAutofillWatcher();
                }}
                onFocus={() => handleInputFocus('email')}
                onBlur={() => handleInputBlur('email')}
                onPaste={handleManualPaste}
                onAnimationStart={(e) => {
                  if (e.animationName === 'adminAutofillDetect') startAutofillWatcher();
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
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onInput={(e) => {
                  if (manualEntryRef.current) return;
                  const inputType = (e.nativeEvent as InputEvent).inputType ?? '';
                  if (
                    inputType === 'insertText' ||
                    inputType === 'deleteContentBackward' ||
                    inputType === 'deleteContentForward' ||
                    inputType === 'insertFromPaste'
                  ) {
                    manualEntryRef.current = true;
                    lastEventRef.current = `MANUAL INPUT (${inputType})`;
                    stopAutofillWatcher('MANUAL ENTRY');
                    return;
                  }
                  maybeAutoLogin();
                  if (!autoLoginAttemptedRef.current) startAutofillWatcher();
                }}
                onFocus={() => handleInputFocus('password')}
                onBlur={() => handleInputBlur('password')}
                onPaste={handleManualPaste}
                onAnimationStart={(e) => {
                  if (e.animationName === 'adminAutofillDetect') startAutofillWatcher();
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
                name="username"
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

      {!resetMode && (
        <div
          style={{
            marginTop: '16px',
            padding: '10px 12px',
            background: 'rgba(0,0,0,0.75)',
            borderRadius: '8px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '11px',
            lineHeight: '1.6',
            color: '#0f0',
            pointerEvents: 'none',
            userSelect: 'none',
            maxWidth: '360px',
            margin: '16px auto 0',
            border: '1px solid rgba(0,255,0,0.2)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#0ff' }}>
            AUTOLOGIN DEBUG
          </div>
          <div>Email focus: {emailFocusRef.current ? 'YES' : 'NO'}</div>
          <div>Password focus: {passwordFocusRef.current ? 'YES' : 'NO'}</div>
          <div>Watcher: {watcherActive ? 'ACTIVE' : 'INACTIVE'}</div>
          <div>Email length: {currentEmailLen}</div>
          <div>Password length: {currentPwLen}</div>
          <div>Both values detected: {bothValuesDetectedRef.current ? 'YES' : 'NO'}</div>
          <div>Manual entry: {manualEntryRef.current ? 'YES' : 'NO'}</div>
          <div>Auto-login attempted: {autoLoginAttemptedRef.current ? 'YES' : 'NO'}</div>
          <div>Loading: {loading ? 'YES' : 'NO'}</div>
          <div>Reset mode: {resetMode ? 'YES' : 'NO'}</div>
          <div>requestSubmit called: {requestSubmitCalledRef.current ? 'YES' : 'NO'}</div>
          <div>handleLogin entered: {handleLoginEnteredRef.current ? 'YES' : 'NO'}</div>
          <div>Last event: {lastEventRef.current}</div>
        </div>
      )}
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

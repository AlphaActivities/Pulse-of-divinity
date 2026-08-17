const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const TOKEN_KEY = 'pod_admin_session';
const AUTH_TIMEOUT_MS = 12000;

export interface AdminSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id: string;
  email: string;
}

export interface AdminProfile {
  id: string;
  auth_user_id: string;
  display_name: string;
  email: string;
  role: string;
}

function authHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<{ session: AdminSession | null; error: string | null }> {
  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      },
      AUTH_TIMEOUT_MS
    );

    const data = await res.json();

    if (!res.ok) {
      return { session: null, error: 'Invalid email or password.' };
    }

    const session: AdminSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      user_id: data.user.id,
      email: data.user.email,
    };

    persistSession(session);
    return { session, error: null };
  } catch {
    return { session: null, error: 'Unable to connect. Please try again.' };
  }
}

export async function refreshSession(
  refreshToken: string
): Promise<{ session: AdminSession | null; error: string | null }> {
  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
      AUTH_TIMEOUT_MS
    );

    const data = await res.json();

    if (!res.ok) {
      return { session: null, error: 'Session expired' };
    }

    const session: AdminSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      user_id: data.user.id,
      email: data.user.email,
    };

    persistSession(session);
    return { session, error: null };
  } catch {
    return { session: null, error: 'Session expired' };
  }
}

export async function logout(token: string): Promise<void> {
  try {
    await fetchWithTimeout(
      `${SUPABASE_URL}/auth/v1/logout`,
      {
        method: 'POST',
        headers: authHeaders(token),
      },
      AUTH_TIMEOUT_MS
    );
  } catch {
    // Best-effort — clear local session regardless
  }
  clearSession();
}

export async function requestPasswordReset(
  email: string
): Promise<{ error: string | null }> {
  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/auth/v1/recover`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email }),
      },
      AUTH_TIMEOUT_MS
    );

    if (!res.ok) {
      return { error: 'Unable to send reset email. Please try again.' };
    }

    return { error: null };
  } catch {
    return { error: 'Unable to connect. Please try again.' };
  }
}

export async function fetchAdminProfile(
  token: string
): Promise<{ profile: AdminProfile | null; error: string | null; status: number }> {
  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/get-me`,
      {
        method: 'GET',
        headers: authHeaders(token),
      },
      AUTH_TIMEOUT_MS
    );

    if (res.status === 401) {
      return { profile: null, error: 'Authentication required', status: 401 };
    }
    if (res.status === 403) {
      return { profile: null, error: 'Your account is not authorized for admin access.', status: 403 };
    }
    if (!res.ok) {
      return {
        profile: null,
        error: 'Failed to verify admin access',
        status: res.status,
      };
    }

    const data = await res.json();
    return { profile: data as AdminProfile, error: null, status: 200 };
  } catch {
    return {
      profile: null,
      error: 'Unable to connect. Please try again.',
      status: 0,
    };
  }
}

export function persistSession(session: AdminSession): void {
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

export function getStoredSession(): AdminSession | null {
  const raw = sessionStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AdminSession;
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

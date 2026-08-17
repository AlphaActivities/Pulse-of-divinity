const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const TOKEN_KEY = 'pod_admin_session';

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

export async function loginWithPassword(
  email: string,
  password: string
): Promise<{ session: AdminSession | null; error: string | null }> {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const msg =
      data.error_description ||
      data.msg ||
      data.error ||
      'Login failed. Please check your credentials.';
    return { session: null, error: msg };
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
}

export async function refreshSession(
  refreshToken: string
): Promise<{ session: AdminSession | null; error: string | null }> {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
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
}

export async function logout(token: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: authHeaders(token),
    });
  } catch {
    // Best-effort — clear local session regardless
  }
  clearSession();
}

export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    return { error: 'Unable to send reset email. Please try again.' };
  }

  return { error: null };
}

export async function fetchAdminProfile(
  token: string
): Promise<{ profile: AdminProfile | null; error: string | null; status: number }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-me`, {
    method: 'GET',
    headers: authHeaders(token),
  });

  if (res.status === 401) {
    return { profile: null, error: 'Authentication required', status: 401 };
  }
  if (res.status === 403) {
    return { profile: null, error: 'Access denied', status: 403 };
  }
  if (!res.ok) {
    return { profile: null, error: 'Failed to verify admin access', status: res.status };
  }

  const data = await res.json();
  return { profile: data as AdminProfile, error: null, status: 200 };
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

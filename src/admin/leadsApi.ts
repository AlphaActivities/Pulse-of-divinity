const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const API_TIMEOUT_MS = 12000;

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

export type PrimaryFilter = 'all_active' | 'new' | 'follow_up' | 'archived';

export type LeadScope = 'active' | 'archived';

export type DashboardView =
  | 'new'
  | 'active_conversations'
  | 'due_today'
  | 'overdue'
  | 'won';

export interface NormalizedFilter {
  scope: LeadScope;
  status: string;
  view?: DashboardView | null;
}

export interface LeadListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  contact_method: string;
  inquiry_type: string;
  interest: string;
  artwork_id: string | null;
  artwork_title: string | null;
  status: string;
  assigned_admin_id: string | null;
  assigned_admin_name: string | null;
  follow_up_at: string | null;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
}

export interface LeadDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  contact_method: string;
  inquiry_type: string;
  interest: string;
  message: string;
  artwork_id: string | null;
  artwork_title: string | null;
  artwork_collection: string | null;
  artwork_price_display: string | null;
  artwork_price_numeric: number | null;
  status: string;
  assigned_admin_id: string | null;
  assigned_admin_name: string | null;
  follow_up_at: string | null;
  outcome: string | null;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateLeadBody {
  id: string;
  status?: string | null;
  assigned_admin_id?: string | null;
  follow_up_at?: string | null;
  outcome?: string | null;
  archived?: boolean;
}

export interface ListLeadsResponse {
  leads: LeadListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ListLeadsParams {
  scope: LeadScope;
  status: string;
  view?: DashboardView | null;
  assignmentFilter: string;
  search: string;
  page: number;
}

export async function fetchLeads(
  token: string,
  params: ListLeadsParams,
): Promise<{ data: ListLeadsResponse | null; error: string | null; status: number }> {
  const searchParams = new URLSearchParams({
    scope: params.scope,
    page: String(params.page),
  });

  if (params.status) searchParams.set('status', params.status);
  if (params.view) searchParams.set('view', params.view);
  if (params.assignmentFilter) searchParams.set('assignment', params.assignmentFilter);
  if (params.search) searchParams.set('search', params.search);

  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/list-leads?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (res.status === 401) return { data: null, error: 'Authentication required', status: 401 };
    if (res.status === 403) return { data: null, error: 'Access denied', status: 403 };
    if (!res.ok) return { data: null, error: 'Failed to retrieve leads', status: res.status };

    const data = (await res.json()) as ListLeadsResponse;
    return { data, error: null, status: 200 };
  } catch {
    return { data: null, error: 'Unable to connect. Please try again.', status: 0 };
  }
}

export async function fetchLeadDetail(
  token: string,
  leadId: string,
): Promise<{ data: LeadDetail | null; error: string | null; status: number }> {
  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/get-lead?id=${encodeURIComponent(leadId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (res.status === 401) return { data: null, error: 'Authentication required', status: 401 };
    if (res.status === 403) return { data: null, error: 'Access denied', status: 403 };
    if (res.status === 404) return { data: null, error: 'Lead not found', status: 404 };
    if (!res.ok) return { data: null, error: 'Unable to load this lead.', status: res.status };

    const data = (await res.json()) as LeadDetail;
    return { data, error: null, status: 200 };
  } catch {
    return { data: null, error: 'Unable to connect. Please try again.', status: 0 };
  }
}

export async function updateLead(
  token: string,
  body: UpdateLeadBody,
): Promise<{ data: LeadDetail | null; error: string | null; status: number }> {
  try {
    const res = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/update-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) return { data: null, error: 'Authentication required', status: 401 };
    if (res.status === 403) return { data: null, error: 'Access denied', status: 403 };
    if (res.status === 400) {
      const errData = await res.json().catch(() => ({}));
      return { data: null, error: errData.error || 'Invalid request', status: 400 };
    }
    if (!res.ok) return { data: null, error: 'Unable to save changes. Please try again.', status: res.status };

    const data = (await res.json()) as LeadDetail;
    return { data, error: null, status: 200 };
  } catch {
    return { data: null, error: 'Unable to connect. Please try again.', status: 0 };
  }
}

export interface LeadNote {
  id: string;
  lead_id: string;
  body: string;
  author_admin_id: string;
  author_name: string | null;
  created_at: string;
}

export interface DashboardSummary {
  summary: {
    new: number;
    active: number;
    due_today: number;
    overdue: number;
    won: number;
    unassigned: number;
  };
  attention: Array<{
    id: string;
    name: string;
    inquiry_type: string;
    artwork_title: string | null;
    follow_up_at: string;
    assigned_admin_name: string | null;
    overdue: boolean;
  }>;
  recent: Array<{
    id: string;
    name: string;
    inquiry_type: string;
    artwork_title: string | null;
    status: string;
    created_at: string;
  }>;
}

export interface AdminOption {
  id: string;
  display_name: string;
  email: string;
}

export async function fetchAdminOptions(
  token: string,
): Promise<{ data: AdminOption[] | null; error: string | null }> {
  try {
    const res = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/list-admins`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return { data: null, error: 'Failed to load admins' };
    const data = (await res.json()) as AdminOption[];
    return { data, error: null };
  } catch {
    return { data: null, error: 'Unable to connect. Please try again.' };
  }
}

export async function fetchNotes(
  token: string,
  leadId: string,
): Promise<{ data: LeadNote[] | null; error: string | null; status: number }> {
  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/list-notes?lead_id=${encodeURIComponent(leadId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (res.status === 401) return { data: null, error: 'Authentication required', status: 401 };
    if (res.status === 403) return { data: null, error: 'Access denied', status: 403 };
    if (!res.ok) return { data: null, error: 'Failed to load notes', status: res.status };
    const data = (await res.json()) as { notes: LeadNote[] };
    return { data: data.notes, error: null, status: 200 };
  } catch {
    return { data: null, error: 'Unable to connect. Please try again.', status: 0 };
  }
}

export async function addNote(
  token: string,
  leadId: string,
  body: string,
): Promise<{ data: LeadNote | null; error: string | null; status: number }> {
  try {
    const res = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/add-note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ lead_id: leadId, body }),
    });
    if (res.status === 401) return { data: null, error: 'Authentication required', status: 401 };
    if (res.status === 403) return { data: null, error: 'Access denied', status: 403 };
    if (res.status === 400) {
      const errData = await res.json().catch(() => ({}));
      return { data: null, error: errData.error || 'Invalid request', status: 400 };
    }
    if (!res.ok) return { data: null, error: 'Unable to add note', status: res.status };
    const data = (await res.json()) as LeadNote;
    return { data, error: null, status: 200 };
  } catch {
    return { data: null, error: 'Unable to connect. Please try again.', status: 0 };
  }
}

export async function fetchDashboardSummary(
  token: string,
): Promise<{ data: DashboardSummary | null; error: string | null; status: number }> {
  try {
    const res = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/dashboard-summary`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) return { data: null, error: 'Authentication required', status: 401 };
    if (res.status === 403) return { data: null, error: 'Access denied', status: 403 };
    if (!res.ok) return { data: null, error: 'Unable to load dashboard information.', status: res.status };
    const data = (await res.json()) as DashboardSummary;
    return { data, error: null, status: 200 };
  } catch {
    return { data: null, error: 'Unable to connect. Please try again.', status: 0 };
  }
}

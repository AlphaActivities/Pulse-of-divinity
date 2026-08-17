const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type PrimaryFilter = 'all_active' | 'new' | 'follow_up' | 'archived';

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
  primaryFilter: PrimaryFilter;
  statusFilter: string;
  assignmentFilter: string;
  search: string;
  page: number;
}

export async function fetchLeads(
  token: string,
  params: ListLeadsParams,
): Promise<{ data: ListLeadsResponse | null; error: string | null; status: number }> {
  const searchParams = new URLSearchParams({
    primary: params.primaryFilter,
    page: String(params.page),
  });

  if (params.statusFilter) searchParams.set('status', params.statusFilter);
  if (params.assignmentFilter) searchParams.set('assignment', params.assignmentFilter);
  if (params.search) searchParams.set('search', params.search);

  try {
    const res = await fetch(
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
    return { data: null, error: 'Network error', status: 0 };
  }
}

export async function fetchLeadDetail(
  token: string,
  leadId: string,
): Promise<{ data: LeadDetail | null; error: string | null; status: number }> {
  try {
    const res = await fetch(
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
    return { data: null, error: 'Network error', status: 0 };
  }
}

export async function updateLead(
  token: string,
  body: UpdateLeadBody,
): Promise<{ data: LeadDetail | null; error: string | null; status: number }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-lead`, {
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
    return { data: null, error: 'Network error', status: 0 };
  }
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
    const res = await fetch(`${SUPABASE_URL}/functions/v1/list-admins`, {
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
    return { data: null, error: 'Network error' };
  }
}

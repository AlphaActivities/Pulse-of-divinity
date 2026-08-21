import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VALID_STATUSES = new Set([
  "NEW",
  "CONTACTED",
  "ACTIVE_CONVERSATION",
  "FOLLOW_UP",
  "QUALIFIED",
  "WON",
  "CLOSED",
]);

const VALID_VIEWS = new Set([
  "new",
  "active_conversations",
  "due_today",
  "overdue",
  "won",
]);

const ACTIVE_CONVERSATION_STATUSES = ["CONTACTED", "ACTIVE_CONVERSATION", "FOLLOW_UP", "QUALIFIED"];
const PAGE_SIZE = 25;
const MAX_SEARCH_LENGTH = 200;

interface ListLeadsParams {
  scope: "active" | "archived";
  status: string;
  view: string;
  assignmentFilter: string;
  search: string;
  page: number;
  adminId: string;
}

function parseParams(url: URL, adminId: string): ListLeadsParams {
  const scopeParam = url.searchParams.get("scope") || "active";
  const scope = scopeParam === "archived" ? "archived" : "active";

  const status = url.searchParams.get("status") || "";
  const validStatus = VALID_STATUSES.has(status) ? status : "";

  const viewParam = url.searchParams.get("view") || "";
  const view = VALID_VIEWS.has(viewParam) ? viewParam : "";

  const assignmentFilter = url.searchParams.get("assignment") || "";

  let search = url.searchParams.get("search") || "";
  search = search.trim().slice(0, MAX_SEARCH_LENGTH);

  let page = parseInt(url.searchParams.get("page") || "1", 10);
  if (isNaN(page) || page < 1) page = 1;

  return {
    scope,
    status: validStatus,
    view,
    assignmentFilter,
    search,
    page,
    adminId,
  };
}

async function verifyAdmin(
  supabase: ReturnType<typeof createClient>,
  token: string,
): Promise<{ authorized: boolean; adminId: string | null }> {
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { authorized: false, adminId: null };

  const { data: admin } = await supabase
    .from("admins")
    .select("id, active")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (!admin || !admin.active) return { authorized: false, adminId: null };
  return { authorized: true, adminId: admin.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { authorized, adminId } = await verifyAdmin(supabase, token);
    if (!authorized || !adminId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const params = parseParams(url, adminId);

    let query = supabase.from("leads").select(
      "id, name, email, phone, contact_method, inquiry_type, interest, artwork_id, artwork_title, status, assigned_admin_id, follow_up_at, archived, archived_at, created_at",
      { count: "exact" },
    );

    // Scope: archived vs active
    query = query.eq("archived", params.scope === "archived");

    // Dashboard views are explicit operational refinements of the active scope.
    if (params.view === "active_conversations") {
      query = query.in("status", ACTIVE_CONVERSATION_STATUSES);
    } else if (params.view === "due_today" || params.view === "overdue") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString().slice(0, 10);
      const tomorrowStart = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);
      query = query.not("follow_up_at", "is", null);
      if (params.view === "due_today") {
        query = query.gte("follow_up_at", todayStart).lt("follow_up_at", tomorrowStart);
      } else {
        query = query.lt("follow_up_at", todayStart);
      }
    } else if (params.status) {
      query = query.eq("status", params.status);
    }

    // Assignment filter
    if (params.assignmentFilter === "me") {
      query = query.eq("assigned_admin_id", params.adminId);
    } else if (params.assignmentFilter === "unassigned") {
      query = query.is("assigned_admin_id", null);
    } else if (params.assignmentFilter.startsWith("admin:")) {
      const targetAdminId = params.assignmentFilter.slice(6);
      if (targetAdminId.length > 0 && targetAdminId.length < 100) {
        query = query.eq("assigned_admin_id", targetAdminId);
      }
    }

    // Search
    if (params.search) {
      const escapedSearch = params.search.replace(/[%_]/g, "\\$&");
      query = query.or(
        `name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%,phone.ilike.%${escapedSearch}%,artwork_title.ilike.%${escapedSearch}%`,
      );
    }

    // Pagination
    const offset = (params.page - 1) * PAGE_SIZE;
    query = query.order("created_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1);

    const { data: leads, error, count } = await query;

    if (error) {
      console.error("list-leads query error:", error.message);
      return new Response(JSON.stringify({ error: "Failed to retrieve leads" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch admin display names for assignment
    const adminIds = leads
      ?.map((l) => l.assigned_admin_id)
      .filter((id): id is string => id !== null) ?? [];

    let adminMap: Record<string, string> = {};
    if (adminIds.length > 0) {
      const { data: admins } = await supabase
        .from("admins")
        .select("id, display_name")
        .in("id", [...new Set(adminIds)]);

      if (admins) {
        adminMap = Object.fromEntries(admins.map((a) => [a.id, a.display_name]));
      }
    }

    const leadsWithAdminName = (leads ?? []).map((l) => ({
      ...l,
      assigned_admin_name: l.assigned_admin_id ? (adminMap[l.assigned_admin_id] ?? null) : null,
    }));

    return new Response(
      JSON.stringify({
        leads: leadsWithAdminName,
        total: count ?? 0,
        page: params.page,
        page_size: PAGE_SIZE,
        total_pages: Math.ceil((count ?? 0) / PAGE_SIZE),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("list-leads error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

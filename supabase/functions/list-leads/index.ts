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

const PAGE_SIZE = 25;
const MAX_SEARCH_LENGTH = 200;

interface ListLeadsParams {
  primaryFilter: "all_active" | "new" | "follow_up" | "archived";
  statusFilter: string;
  assignmentFilter: string;
  search: string;
  page: number;
  adminId: string;
}

function parseParams(url: URL, adminId: string): ListLeadsParams {
  const primary = url.searchParams.get("primary") || "all_active";
  const validPrimaries = new Set(["all_active", "new", "follow_up", "archived"]);
  const primaryFilter = validPrimaries.has(primary)
    ? (primary as ListLeadsParams["primaryFilter"])
    : "all_active";

  const statusFilter = url.searchParams.get("status") || "";
  const validStatus = VALID_STATUSES.has(statusFilter) ? statusFilter : "";

  const assignmentFilter = url.searchParams.get("assignment") || "";

  let search = url.searchParams.get("search") || "";
  search = search.trim().slice(0, MAX_SEARCH_LENGTH);

  let page = parseInt(url.searchParams.get("page") || "1", 10);
  if (isNaN(page) || page < 1) page = 1;

  return {
    primaryFilter,
    statusFilter: validStatus,
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

    // Build query
    let query = supabase.from("leads").select(
      "id, name, email, phone, contact_method, inquiry_type, interest, artwork_id, artwork_title, status, assigned_admin_id, follow_up_at, archived, archived_at, created_at",
      { count: "exact" },
    );

    // Primary filter
    if (params.primaryFilter === "archived") {
      query = query.eq("archived", true);
    } else {
      query = query.eq("archived", false);
      if (params.primaryFilter === "new") {
        query = query.eq("status", "NEW");
      } else if (params.primaryFilter === "follow_up") {
        query = query.eq("status", "FOLLOW_UP");
      }
    }

    // Secondary status filter
    if (params.statusFilter) {
      query = query.eq("status", params.statusFilter);
    }

    // Secondary assignment filter
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

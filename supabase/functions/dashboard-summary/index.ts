import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ACTIVE_STATUSES = ["CONTACTED", "ACTIVE_CONVERSATION", "FOLLOW_UP", "QUALIFIED"];
const MAX_ATTENTION = 8;
const MAX_RECENT = 5;

async function verifyAdmin(
  supabase: SupabaseClient,
  token: string,
): Promise<{ authorized: boolean }> {
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { authorized: false };
  const { data: admin } = await supabase
    .from("admins")
    .select("active, role, project_key")
    .eq("auth_user_id", userData.user.id)
    .single();
  if (!admin || !admin.active || admin.project_key !== "pulse-of-divinity" || !["owner", "client", "staff"].includes(admin.role)) return { authorized: false };
  return { authorized: true };
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
    const { authorized } = await verifyAdmin(supabase, token);
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const todayStr = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const today = new Date(todayStr + 'T00:00:00Z');

    // Count New Leads
    const { count: newCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("archived", false)
      .eq("status", "NEW").throwOnError();

    // Count Active Conversations
    const { count: activeCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("archived", false)
      .in("status", ACTIVE_STATUSES).throwOnError();

    // Count Follow-Ups Due (today)
    const { count: dueTodayCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("archived", false)
      .not("status", "in", "(WON,CLOSED)")
      .not("follow_up_at", "is", null)
      .gte("follow_up_at", todayStr)
      .lt("follow_up_at", new Date(today.getTime() + 86400000).toISOString().slice(0, 10)).throwOnError();

    // Count Overdue (before today)
    const { count: overdueCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("archived", false)
      .not("status", "in", "(WON,CLOSED)")
      .not("follow_up_at", "is", null)
      .lt("follow_up_at", todayStr).throwOnError();

    // Count Won
    const { count: wonCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("archived", false)
      .eq("status", "WON").throwOnError();

    // Count Unassigned
    const { count: unassignedCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("archived", false)
      .is("assigned_admin_id", null).throwOnError();

    // Follow-Up Attention: overdue (oldest first) then due today
    const { data: overdueLeads } = await supabase
      .from("leads")
      .select("id, name, inquiry_type, artwork_title, follow_up_at, assigned_admin_id")
      .eq("archived", false)
      .not("status", "in", "(WON,CLOSED)")
      .not("follow_up_at", "is", null)
      .lt("follow_up_at", todayStr)
      .order("follow_up_at", { ascending: true })
      .limit(MAX_ATTENTION).throwOnError();

    const remainingSlots = MAX_ATTENTION - (overdueLeads?.length ?? 0);
    let todayLeads: typeof overdueLeads = [];
    if (remainingSlots > 0) {
      const { data: todayData } = await supabase
        .from("leads")
        .select("id, name, inquiry_type, artwork_title, follow_up_at, assigned_admin_id")
        .eq("archived", false)
        .not("status", "in", "(WON,CLOSED)")
      .not("follow_up_at", "is", null)
        .gte("follow_up_at", todayStr)
        .lt("follow_up_at", new Date(today.getTime() + 86400000).toISOString().slice(0, 10))
        .order("follow_up_at", { ascending: true })
        .limit(remainingSlots).throwOnError();
      todayLeads = todayData ?? [];
    }

    const attentionLeads = [...(overdueLeads ?? []), ...todayLeads];

    // Fetch admin names for attention leads
    const attentionAdminIds = [...new Set(attentionLeads.map((l) => l.assigned_admin_id).filter((id): id is string => id !== null))];
    let attentionAdminMap: Record<string, string> = {};
    if (attentionAdminIds.length > 0) {
      const { data: admins } = await supabase
        .from("admins")
        .select("id, display_name")
        .in("id", attentionAdminIds).throwOnError();
      if (admins) attentionAdminMap = Object.fromEntries(admins.map((a) => [a.id, a.display_name]));
    }

    const attentionWithNames = attentionLeads.map((l) => ({
      id: l.id,
      name: l.name,
      inquiry_type: l.inquiry_type,
      artwork_title: l.artwork_title,
      follow_up_at: l.follow_up_at,
      assigned_admin_name: l.assigned_admin_id ? (attentionAdminMap[l.assigned_admin_id] ?? null) : null,
      overdue: new Date(l.follow_up_at) < today,
    }));

    // Recent Leads
    const { data: recentLeads } = await supabase
      .from("leads")
      .select("id, name, inquiry_type, artwork_title, status, created_at")
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(MAX_RECENT).throwOnError();

    const { count: pendingQuotes } = await supabase.from("commissions").select("lead_id", {count:"exact",head:true}).eq("approval","pending").in("stage",["brief","quoted"]).throwOnError();
    const { data: metrics } = await supabase.from("collector_metrics").select("event").throwOnError();
    const { data: upcoming } = await supabase.from("leads").select("id,name,follow_up_at,inquiry_type").eq("archived",false).not("status","in","(WON,CLOSED)").gt("follow_up_at",todayStr).order("follow_up_at").limit(8).throwOnError();
    return new Response(
      JSON.stringify({
        pending_quotes: pendingQuotes ?? 0,
        confirmed_metrics: {artwork_inquiries: (metrics ?? []).filter(m=>m.event==='artwork_inquiry').length,commission_inquiries:(metrics ?? []).filter(m=>m.event==='commission_inquiry').length,accepted_commissions:(metrics ?? []).filter(m=>m.event==='commission_accepted').length,completed_sales:(metrics ?? []).filter(m=>m.event==='sale_completed').length},
        upcoming,
        summary: {
          new: newCount ?? 0,
          active: activeCount ?? 0,
          due_today: dueTodayCount ?? 0,
          overdue: overdueCount ?? 0,
          won: wonCount ?? 0,
          unassigned: unassignedCount ?? 0,
        },
        attention: attentionWithNames,
        recent: recentLeads ?? [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("dashboard-summary error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

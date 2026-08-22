import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const { authorized } = await verifyAdmin(supabase, token);
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const leadId = url.searchParams.get("lead_id") || "";
    if (!leadId || leadId.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid lead ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm lead exists
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .single();
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: notes, error } = await supabase
      .from("lead_notes")
      .select("id, lead_id, body, author_admin_id, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: "Failed to retrieve notes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch author display names
    const authorIds = [...new Set((notes ?? []).map((n) => n.author_admin_id).filter((id): id is string => id !== null))];
    let authorMap: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: admins } = await supabase
        .from("admins")
        .select("id, display_name")
        .in("id", authorIds);
      if (admins) {
        authorMap = Object.fromEntries(admins.map((a) => [a.id, a.display_name]));
      }
    }

    const notesWithAuthor = (notes ?? []).map((n) => ({
      id: n.id,
      lead_id: n.lead_id,
      body: n.body,
      author_admin_id: n.author_admin_id,
      author_name: n.author_admin_id ? (authorMap[n.author_admin_id] ?? null) : null,
      created_at: n.created_at,
    }));

    return new Response(JSON.stringify({ notes: notesWithAuthor }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("list-notes error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

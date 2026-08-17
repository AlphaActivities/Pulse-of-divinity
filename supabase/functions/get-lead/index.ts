import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function verifyAdmin(
  supabase: ReturnType<typeof createClient>,
  token: string,
): Promise<{ authorized: boolean }> {
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { authorized: false };

  const { data: admin } = await supabase
    .from("admins")
    .select("active")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (!admin || !admin.active) return { authorized: false };
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

    const url = new URL(req.url);
    const leadId = url.searchParams.get("id") || "";

    if (!leadId || leadId.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid lead ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .select(
        "id, name, email, phone, contact_method, inquiry_type, interest, message, artwork_id, artwork_title, artwork_collection, artwork_price_display, artwork_price_numeric, status, assigned_admin_id, follow_up_at, outcome, archived, archived_at, created_at, updated_at",
      )
      .eq("id", leadId)
      .single();

    if (error || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch assigned admin display name
    let assignedAdminName: string | null = null;
    if (lead.assigned_admin_id) {
      const { data: admin } = await supabase
        .from("admins")
        .select("display_name")
        .eq("id", lead.assigned_admin_id)
        .single();
      if (admin) assignedAdminName = admin.display_name;
    }

    return new Response(
      JSON.stringify({ ...lead, assigned_admin_name: assignedAdminName }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("get-lead error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

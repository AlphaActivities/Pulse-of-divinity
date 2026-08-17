import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_NOTE_LENGTH = 5000;

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
  if (req.method !== "POST") {
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

    const body = await req.json();
    const leadId = body.lead_id;

    if (!leadId || typeof leadId !== "string" || leadId.length > 100) {
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

    const noteText = typeof body.body === "string" ? body.body.trim() : "";
    if (!noteText) {
      return new Response(JSON.stringify({ error: "Note cannot be empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (noteText.length > MAX_NOTE_LENGTH) {
      return new Response(JSON.stringify({ error: "Note exceeds maximum length of 5000 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Author is derived from the authenticated admin identity — never from frontend
    const { data: note, error } = await supabase
      .from("lead_notes")
      .insert({
        lead_id: leadId,
        author_admin_id: adminId,
        body: noteText,
      })
      .select("id, lead_id, body, author_admin_id, created_at")
      .single();

    if (error || !note) {
      return new Response(JSON.stringify({ error: "Unable to add note" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch author display name
    const { data: admin } = await supabase
      .from("admins")
      .select("display_name")
      .eq("id", adminId)
      .single();

    return new Response(
      JSON.stringify({
        ...note,
        author_name: admin?.display_name ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("add-note error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

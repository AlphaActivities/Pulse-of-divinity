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

const VALID_OUTCOMES = new Set([
  "Artwork Sale",
  "Commission Secured",
  "Not Ready",
  "No Response",
  "Not a Fit",
  "Other",
]);

const MUTABLE_FIELDS = new Set([
  "status",
  "assigned_admin_id",
  "follow_up_at",
  "outcome",
  "archived",
  "archived_at",
]);

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

    const { authorized } = await verifyAdmin(supabase, token);
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const leadId = body.id;

    if (!leadId || typeof leadId !== "string" || leadId.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid lead ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build update object from allowlisted fields only
    const updates: Record<string, unknown> = {};

    // Validate status
    if (body.status !== undefined) {
      if (body.status !== null && !VALID_STATUSES.has(body.status)) {
        return new Response(JSON.stringify({ error: "Invalid status value" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      updates.status = body.status;
    }

    // Validate assigned_admin_id
    if (body.assigned_admin_id !== undefined) {
      if (body.assigned_admin_id === null) {
        updates.assigned_admin_id = null;
      } else {
        const adminId = body.assigned_admin_id;
        if (typeof adminId !== "string" || adminId.length > 100) {
          return new Response(JSON.stringify({ error: "Invalid admin assignment" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Verify the admin exists and is active
        const { data: targetAdmin } = await supabase
          .from("admins")
          .select("id, active")
          .eq("id", adminId)
          .single();
        if (!targetAdmin || !targetAdmin.active) {
          return new Response(JSON.stringify({ error: "Invalid admin assignment" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        updates.assigned_admin_id = adminId;
      }
    }

    // Validate follow_up_at
    if (body.follow_up_at !== undefined) {
      if (body.follow_up_at === null) {
        updates.follow_up_at = null;
      } else {
        const dateStr = body.follow_up_at;
        if (typeof dateStr !== "string" || dateStr.length > 30) {
          return new Response(JSON.stringify({ error: "Invalid follow-up date" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const parsed = new Date(dateStr);
        if (isNaN(parsed.getTime())) {
          return new Response(JSON.stringify({ error: "Invalid follow-up date" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        updates.follow_up_at = dateStr;
      }
    }

    // Validate outcome
    if (body.outcome !== undefined) {
      if (body.outcome === null || body.outcome === "") {
        updates.outcome = null;
      } else {
        if (typeof body.outcome !== "string" || body.outcome.length > 200 || !VALID_OUTCOMES.has(body.outcome)) {
          return new Response(JSON.stringify({ error: "Invalid outcome value" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        updates.outcome = body.outcome;
      }
    }

    // Handle archive/restore
    if (body.archived !== undefined) {
      if (body.archived === true) {
        updates.archived = true;
        updates.archived_at = new Date().toISOString();
      } else if (body.archived === false) {
        updates.archived = false;
        updates.archived_at = null;
      }
    }

    // Reject any attempt to update protected fields
    for (const key of Object.keys(body)) {
      if (key !== "id" && !MUTABLE_FIELDS.has(key)) {
        return new Response(JSON.stringify({ error: "Invalid field in update request" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: "No valid fields to update" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", leadId)
      .select(
        "id, name, email, phone, contact_method, inquiry_type, interest, message, artwork_id, artwork_title, artwork_collection, artwork_price_display, artwork_price_numeric, status, assigned_admin_id, follow_up_at, outcome, archived, archived_at, created_at, updated_at",
      )
      .single();

    if (error || !updated) {
      return new Response(JSON.stringify({ error: "Unable to save changes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch assigned admin display name
    let assignedAdminName: string | null = null;
    if (updated.assigned_admin_id) {
      const { data: admin } = await supabase
        .from("admins")
        .select("display_name")
        .eq("id", updated.assigned_admin_id)
        .single();
      if (admin) assignedAdminName = admin.display_name;
    }

    return new Response(
      JSON.stringify({ ...updated, assigned_admin_name: assignedAdminName }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("update-lead error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import Stripe from "npm:stripe@17.7.0";

const STAGING_ORIGIN = "https://divinity-crm-review.gta-alpha-activities.workers.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": STAGING_ORIGIN,
  "Cache-Control": "no-store",
  "Vary": "Origin",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function verifyAdmin(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authorized: false, status: 401, error: "Authentication required" };
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    return { authorized: false, status: 401, error: "Authentication required" };
  }

  const { data: admin, error: adminError } = await supabase
    .from("admins")
    .select("id, role, active, project_key")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (adminError || !admin) {
    return { authorized: false, status: 403, error: "Access denied" };
  }

  const onboardingAdminId = Deno.env.get("STRIPE_ONBOARDING_ADMIN_ID");
  const assignedClient = admin.role === "client" && admin.id === onboardingAdminId;
  if (!admin.active || admin.project_key !== "pulse-of-divinity" ||
      (admin.role !== "owner" && !assignedClient)) {
    return { authorized: false, status: 403, error: "Access denied" };
  }

  return { authorized: true as const, admin };
}

Deno.serve(async (req: Request) => {
  if (req.headers.get("Origin") !== STAGING_ORIGIN) {
    return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authResult = await verifyAdmin(req, supabase);
    if (!authResult.authorized) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read commerce_settings
    const { data: settings, error: settingsError } = await supabase
      .from("commerce_settings")
      .select("id, stripe_connected_account_id")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) {
      console.error("Failed to read commerce_settings:", settingsError?.message);
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const connectedAccountId = settings.stripe_connected_account_id;
    if (!/^acct_[A-Za-z0-9]+$/.test(connectedAccountId ?? "")) {
      return new Response(JSON.stringify({ error: "An existing Stripe account must be associated first." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, {
      maxNetworkRetries: 2,
    });

    // Check that this platform credential can access the existing account.
    await stripe.accounts.retrieve(connectedAccountId);

    // Create a fresh Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: connectedAccountId,
      type: "account_onboarding",
      return_url: STAGING_ORIGIN + "/admin/?stripe_onboarding=complete",
      refresh_url: STAGING_ORIGIN + "/admin/?stripe_onboarding=refresh",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    console.error("start-stripe-onboarding failed");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

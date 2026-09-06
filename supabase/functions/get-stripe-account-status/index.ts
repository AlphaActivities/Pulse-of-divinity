import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import Stripe from "npm:stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
    .select("id, auth_user_id, display_name, email, role, active")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (adminError || !admin) {
    return { authorized: false, status: 403, error: "Access denied" };
  }

  if (!admin.active) {
    return { authorized: false, status: 403, error: "Access denied" };
  }

  return { authorized: true as const, admin };
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      .select("id, stripe_connected_account_id, shipping_rate_us_cents, shipping_rate_ca_cents")
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

    if (!connectedAccountId) {
      return new Response(
        JSON.stringify({
          configured: false,
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
          checkout_ready: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
      maxNetworkRetries: 2,
    });

    const account = await stripe.accounts.retrieve(connectedAccountId);

    const shippingConfigured =
      settings.shipping_rate_us_cents !== null || settings.shipping_rate_ca_cents !== null;

    const checkoutReady =
      account.charges_enabled === true && shippingConfigured;

    return new Response(
      JSON.stringify({
        configured: true,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        checkout_ready: checkoutReady,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("get-stripe-account-status error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

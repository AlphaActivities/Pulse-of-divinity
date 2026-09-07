import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import Stripe from "npm:stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VALID_COUNTRIES = new Set(["US", "CA"]);
const VALID_BUSINESS_TYPES = new Set(["individual", "company", "non_profit"]);
const MAX_EMAIL_LENGTH = 500;

interface OnboardingPayload {
  email: string;
  country: string;
  business_type: string;
}

function validatePayload(data: Record<string, unknown>): { valid: boolean; error?: string; payload?: OnboardingPayload } {
  const email = String(data.email ?? "").trim();
  const country = String(data.country ?? "").trim().toUpperCase();
  const business_type = String(data.business_type ?? "").trim();

  if (!email) return { valid: false, error: "Missing email" };
  if (email.length > MAX_EMAIL_LENGTH) return { valid: false, error: "Email too long" };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, error: "Invalid email format" };

  if (!country) return { valid: false, error: "Missing country" };
  if (!VALID_COUNTRIES.has(country)) return { valid: false, error: "Invalid country" };

  if (!business_type) return { valid: false, error: "Missing business_type" };
  if (!VALID_BUSINESS_TYPES.has(business_type)) return { valid: false, error: "Invalid business_type" };

  return { valid: true, payload: { email, country, business_type } };
}

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

  if (req.method !== "POST") {
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

    const body = await req.json();
    const result = validatePayload(body);
    if (!result.valid) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, country, business_type } = result.payload!;

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

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
      maxNetworkRetries: 2,
    });

    let connectedAccountId = settings.stripe_connected_account_id;

    // Create connected account only if one does not already exist
    if (!connectedAccountId) {
      const account = await stripe.accounts.create({
        country,
        email,
        business_type: business_type as "individual" | "company" | "non_profit",
        controller: {
          losses: { payments: "stripe" },
          fees: { payer: "account" },
          requirement_collection: "stripe",
          stripe_dashboard: { type: "full" },
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      connectedAccountId = account.id;

      // Persist the account ID immediately
      const { error: updateError } = await supabase
        .from("commerce_settings")
        .update({ stripe_connected_account_id: connectedAccountId })
        .eq("id", 1);

      if (updateError) {
        console.error("Failed to persist connected account ID:", updateError.message);
        return new Response(JSON.stringify({ error: "Server configuration error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create a fresh Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: connectedAccountId!,
      type: "account_onboarding",
      return_url: "https://pulseofdivinity.com/admin?stripe_onboarding=complete",
      refresh_url: "https://pulseofdivinity.com/admin?stripe_onboarding=refresh",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("start-stripe-onboarding error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

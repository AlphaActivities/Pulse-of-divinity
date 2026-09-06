import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import Stripe from "npm:stripe@17.7.0";

const ALLOWED_ORIGINS = new Set([
  "https://pulseofdivinity.com",
  "https://www.pulseofdivinity.com",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VALID_COUNTRIES = new Set(["US", "CA"]);
const MAX_FIELD_LENGTH = 500;
const MAX_PHONE_LENGTH = 50;

interface CheckoutPayload {
  artwork_id: string;
  shipping_recipient_name: string;
  shipping_country: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_state_region: string;
  shipping_postal_code: string;
  collector_phone: string | null;
}

function validatePayload(data: Record<string, unknown>): { valid: boolean; error?: string; payload?: CheckoutPayload } {
  const artwork_id = String(data.artwork_id ?? "").trim();
  const shipping_recipient_name = String(data.shipping_recipient_name ?? "").trim();
  const shipping_country = String(data.shipping_country ?? "").trim().toUpperCase();
  const shipping_address_line1 = String(data.shipping_address_line1 ?? "").trim();
  const shipping_address_line2_raw = String(data.shipping_address_line2 ?? "").trim();
  const shipping_city = String(data.shipping_city ?? "").trim();
  const shipping_state_region = String(data.shipping_state_region ?? "").trim();
  const shipping_postal_code = String(data.shipping_postal_code ?? "").trim();
  const collector_phone_raw = String(data.collector_phone ?? "").trim();

  if (!artwork_id) return { valid: false, error: "Missing artwork_id" };
  if (artwork_id.length > MAX_FIELD_LENGTH) return { valid: false, error: "Invalid artwork_id" };
  if (!shipping_recipient_name) return { valid: false, error: "Missing shipping_recipient_name" };
  if (shipping_recipient_name.length > MAX_FIELD_LENGTH) return { valid: false, error: "Invalid shipping_recipient_name" };
  if (!shipping_country) return { valid: false, error: "Missing shipping_country" };
  if (!VALID_COUNTRIES.has(shipping_country)) return { valid: false, error: "Unsupported country" };
  if (!shipping_address_line1) return { valid: false, error: "Missing shipping_address_line1" };
  if (shipping_address_line1.length > MAX_FIELD_LENGTH) return { valid: false, error: "Invalid shipping_address_line1" };
  if (!shipping_city) return { valid: false, error: "Missing shipping_city" };
  if (shipping_city.length > MAX_FIELD_LENGTH) return { valid: false, error: "Invalid shipping_city" };
  if (!shipping_state_region) return { valid: false, error: "Missing shipping_state_region" };
  if (shipping_state_region.length > MAX_FIELD_LENGTH) return { valid: false, error: "Invalid shipping_state_region" };
  if (!shipping_postal_code) return { valid: false, error: "Missing shipping_postal_code" };
  if (shipping_postal_code.length > MAX_FIELD_LENGTH) return { valid: false, error: "Invalid shipping_postal_code" };

  const shipping_address_line2 = shipping_address_line2_raw || null;
  if (shipping_address_line2 && shipping_address_line2.length > MAX_FIELD_LENGTH) {
    return { valid: false, error: "Invalid shipping_address_line2" };
  }

  const collector_phone = collector_phone_raw || null;
  if (collector_phone && collector_phone.length > MAX_PHONE_LENGTH) {
    return { valid: false, error: "Invalid collector_phone" };
  }

  return {
    valid: true,
    payload: {
      artwork_id,
      shipping_recipient_name,
      shipping_country,
      shipping_address_line1,
      shipping_address_line2,
      shipping_city,
      shipping_state_region,
      shipping_postal_code,
      collector_phone,
    },
  };
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
      return new Response(JSON.stringify({ error: "Checkout is not available at this time." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const result = validatePayload(body);
    if (!result.valid) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = result.payload!;

    // Read commerce_settings
    const { data: settings, error: settingsError } = await supabase
      .from("commerce_settings")
      .select("id, stripe_connected_account_id, shipping_rate_us_cents, shipping_rate_ca_cents")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) {
      console.error("Failed to read commerce_settings:", settingsError?.message);
      return new Response(JSON.stringify({ error: "Checkout is not available at this time." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refuse if Stripe not configured
    if (!settings.stripe_connected_account_id) {
      return new Response(JSON.stringify({ error: "Checkout is not available at this time." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Select shipping rate by country
    const shippingRateCents = p.shipping_country === "US"
      ? settings.shipping_rate_us_cents
      : settings.shipping_rate_ca_cents;

    // Refuse if shipping rate not configured
    if (shippingRateCents === null || shippingRateCents === undefined) {
      return new Response(JSON.stringify({ error: "Checkout is not available at this time." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read authoritative artwork inventory
    const { data: artwork, error: artworkError } = await supabase
      .from("artwork_inventory")
      .select("artwork_id, price_cents, currency, purchasable, inventory_status, artwork_title, artwork_collection")
      .eq("artwork_id", p.artwork_id)
      .single();

    if (artworkError || !artwork) {
      return new Response(JSON.stringify({ error: "This artwork is not available for purchase." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!artwork.purchasable || artwork.inventory_status !== "available") {
      return new Response(JSON.stringify({ error: "This artwork is no longer available." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Require trusted title metadata
    if (!artwork.artwork_title) {
      console.error("Artwork missing artwork_title for:", p.artwork_id);
      return new Response(JSON.stringify({ error: "Checkout is not available at this time." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-authoritative values
    const artworkPriceCents = artwork.price_cents;
    const currency = artwork.currency;
    const artworkTitle = artwork.artwork_title;
    const artworkCollection = artwork.artwork_collection || null;
    const shippingCents = shippingRateCents;
    const taxCents = 0;
    const totalCents = artworkPriceCents + shippingCents + taxCents;

    // Calculate Alpha commission (15% of artwork price + shipping, integer cents)
    const baseCents = artworkPriceCents + shippingCents;
    const alphaCommissionCents = Math.floor((baseCents * 15) / 100);

    // Generate reservation token server-side
    const reservationToken = crypto.randomUUID();

    // Atomically reserve artwork for 35 minutes
    const { data: reserveResult, error: reserveError } = await supabase.rpc(
      "reserve_artwork",
      {
        p_artwork_id: p.artwork_id,
        p_reservation_token: reservationToken,
        p_reservation_minutes: 35,
      },
    );

    if (reserveError || !reserveResult) {
      return new Response(JSON.stringify({ error: "This artwork is no longer available." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create pending order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        artwork_id: p.artwork_id,
        artwork_title_snapshot: artworkTitle,
        artwork_collection_snapshot: artworkCollection,
        artwork_price_cents: artworkPriceCents,
        shipping_cents: shippingCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        alpha_commission_cents: alphaCommissionCents,
        currency,
        stripe_connected_account_id: settings.stripe_connected_account_id,
        payment_status: "pending",
        fulfillment_status: "unfulfilled",
        refund_status: "none",
        collector_name: p.shipping_recipient_name,
        collector_email: null,
        collector_phone: p.collector_phone,
        shipping_recipient_name: p.shipping_recipient_name,
        shipping_country: p.shipping_country,
        shipping_address_line1: p.shipping_address_line1,
        shipping_address_line2: p.shipping_address_line2,
        shipping_city: p.shipping_city,
        shipping_state_region: p.shipping_state_region,
        shipping_postal_code: p.shipping_postal_code,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Failed to create order:", orderError?.message);
      // Release the reservation since order creation failed
      await supabase.rpc("release_reservation", { p_reservation_token: reservationToken });
      return new Response(JSON.stringify({ error: "Checkout is not available at this time." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = order.id;

    // Create Stripe Checkout Session as a direct charge
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
      maxNetworkRetries: 2,
    });

    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes from now

    const productDescription = artworkCollection
      ? `Original artwork from the ${artworkCollection === "for-sale" ? "For Sale" : artworkCollection} collection`
      : "Original artwork";

    const sessionParams: Record<string, unknown> = {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: artworkTitle,
              description: productDescription,
            },
            unit_amount: artworkPriceCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: alphaCommissionCents,
        metadata: {
          artwork_id: p.artwork_id,
          reservation_token: reservationToken,
          order_id: orderId,
        },
      },
      metadata: {
        artwork_id: p.artwork_id,
        reservation_token: reservationToken,
        order_id: orderId,
      },
      expires_at: expiresAt,
      success_url: "https://pulseofdivinity.com?checkout=success",
      cancel_url: "https://pulseofdivinity.com?checkout=cancelled",
    };

    try {
      const session = await stripe.checkout.sessions.create(
        sessionParams as Stripe.Checkout.SessionCreateParams,
        { stripeAccount: settings.stripe_connected_account_id },
      );

      // Store stripe_checkout_session_id on orders and artwork_inventory
      await supabase
        .from("orders")
        .update({ stripe_checkout_session_id: session.id })
        .eq("id", orderId);

      await supabase
        .from("artwork_inventory")
        .update({ stripe_checkout_session_id: session.id })
        .eq("artwork_id", p.artwork_id);

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (stripeErr) {
      console.error("Stripe session creation failed:", stripeErr);
      // Release the reservation
      await supabase.rpc("release_reservation", { p_reservation_token: reservationToken });
      // Mark order as failed
      await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", orderId);
      return new Response(JSON.stringify({ error: "Unable to create checkout session. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("create-commerce-checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

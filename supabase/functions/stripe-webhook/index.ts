import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import Stripe from "npm:stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

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
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey || !webhookSecret) {
      console.error("Stripe secrets not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
      maxNetworkRetries: 2,
    });

    // Read raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("Stripe-Signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signature BEFORE trusting or parsing the event
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Read commerce_settings to get expected connected account ID
    const { data: settings, error: settingsError } = await supabase
      .from("commerce_settings")
      .select("stripe_connected_account_id")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) {
      console.error("Failed to read commerce_settings:", settingsError?.message);
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate event belongs to expected connected account
    const eventAccount = (event as Record<string, unknown>).account as string | undefined;
    if (eventAccount && settings.stripe_connected_account_id && eventAccount !== settings.stripe_connected_account_id) {
      // Acknowledge safely but do not process
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventId = event.id;
    const eventType = event.type;

    // --- ATOMIC CLAIM / RETRY / RECLAIM ---

    // Attempt 1: INSERT new event as processing
    const { error: insertError } = await supabase
      .from("stripe_webhook_events")
      .insert({
        stripe_event_id: eventId,
        event_type: eventType,
        processing_status: "processing",
        processing_started_at: new Date().toISOString(),
      });

    if (!insertError) {
      // Insert succeeded — this invocation owns processing
      return processEvent(event, supabase, stripe, eventId, eventType, settings.stripe_connected_account_id);
    }

    // Insert failed — event already exists. Check current state.
    const { data: existingEvent } = await supabase
      .from("stripe_webhook_events")
      .select("processing_status, processing_started_at")
      .eq("stripe_event_id", eventId)
      .single();

    if (!existingEvent) {
      // Could not read — return 500 for retry
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingEvent.processing_status === "processed") {
      // Already handled
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingEvent.processing_status === "failed") {
      // Attempt atomic retry claim: failed → processing
      const { data: retryClaim, error: retryError } = await supabase
        .from("stripe_webhook_events")
        .update({
          processing_status: "processing",
          processing_started_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("stripe_event_id", eventId)
        .eq("processing_status", "failed")
        .select("stripe_event_id")
        .single();

      if (retryError || !retryClaim) {
        // Another invocation won the retry
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Won the retry — process again
      return processEvent(event, supabase, stripe, eventId, eventType, settings.stripe_connected_account_id);
    }

    if (existingEvent.processing_status === "processing") {
      // Check for staleness
      const startedAt = existingEvent.processing_started_at
        ? new Date(existingEvent.processing_started_at).getTime()
        : 0;
      const isStale = Date.now() - startedAt > STALE_TIMEOUT_MS;

      if (!isStale) {
        // Recent — do not concurrently process
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Attempt atomic reclaim
      const staleThreshold = new Date(Date.now() - STALE_TIMEOUT_MS).toISOString();
      const { data: reclaimClaim, error: reclaimError } = await supabase
        .from("stripe_webhook_events")
        .update({
          processing_started_at: new Date().toISOString(),
        })
        .eq("stripe_event_id", eventId)
        .eq("processing_status", "processing")
        .lt("processing_started_at", staleThreshold)
        .select("stripe_event_id")
        .single();

      if (reclaimError || !reclaimClaim) {
        // Another invocation won the reclaim
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Won the reclaim — process again
      return processEvent(event, supabase, stripe, eventId, eventType, settings.stripe_connected_account_id);
    }

    // Unknown state — acknowledge safely
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function markEventProcessed(supabase: ReturnType<typeof createClient>, eventId: string) {
  await supabase
    .from("stripe_webhook_events")
    .update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("stripe_event_id", eventId);
}

async function markEventFailed(supabase: ReturnType<typeof createClient>, eventId: string, errorMessage: string) {
  await supabase
    .from("stripe_webhook_events")
    .update({
      processing_status: "failed",
      last_error: errorMessage,
    })
    .eq("stripe_event_id", eventId);
}

async function processEvent(
  event: Stripe.Event,
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  eventId: string,
  eventType: string,
  connectedAccountId: string | null,
): Promise<Response> {
  const jsonResponse = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    switch (eventType) {
      case "checkout.session.completed":
        return await handleCheckoutCompleted(event, supabase, stripe, eventId, connectedAccountId);
      case "checkout.session.expired":
        return await handleCheckoutExpired(event, supabase, eventId);
      case "charge.refunded":
        return await handleChargeRefunded(event, supabase, eventId);
      case "charge.dispute.created":
        return await handleDisputeCreated(event, supabase, eventId);
      default:
        // Unknown event type — acknowledge
        await markEventProcessed(supabase, eventId);
        return jsonResponse(200, { received: true });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown processing error";
    console.error(`Event ${eventId} processing failed:`, errorMsg);
    await markEventFailed(supabase, eventId, errorMsg);
    return jsonResponse(500, { error: "Processing failed" });
  }
}

async function handleCheckoutCompleted(
  event: Stripe.Event,
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  eventId: string,
  connectedAccountId: string | null,
): Promise<Response> {
  const session = event.data.object as Stripe.Checkout.Session;

  // Verify payment_status indicates successful immediate payment
  if (session.payment_status !== "paid") {
    await markEventFailed(supabase, eventId, "Session payment_status is not 'paid'");
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate metadata
  const metadata = session.metadata || {};
  const artworkId = metadata.artwork_id;
  const reservationToken = metadata.reservation_token;
  const orderId = metadata.order_id;

  if (!artworkId || !reservationToken || !orderId) {
    await markEventFailed(supabase, eventId, "Missing required metadata");
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Read the order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, total_cents, payment_status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    await markEventFailed(supabase, eventId, `Order not found: ${orderId}`);
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify Stripe monetary values match expected order values
  if (session.amount_total !== order.total_cents) {
    await markEventFailed(supabase, eventId, `Amount mismatch: Stripe=${session.amount_total}, Order=${order.total_cents}`);
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Read authoritative email from Stripe customer details
  const customerEmail = session.customer_details?.email || null;
  if (!customerEmail) {
    await markEventFailed(supabase, eventId, "No customer email from Stripe");
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Retrieve payment intent to get charge ID
  let stripeChargeId: string | null = null;
  let stripePaymentIntentId: string | null = session.payment_intent as string | null;

  if (stripePaymentIntentId && connectedAccountId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(
        stripePaymentIntentId,
        { stripeAccount: connectedAccountId },
      );
      if (pi.latest_charge) {
        stripeChargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
      }
    } catch {
      // Non-fatal — we still have the payment intent ID
      console.error("Failed to retrieve payment intent for charge ID");
    }
  }

  // Update order to paid (atomically set email + payment_status in same statement)
  const { error: updateOrderError } = await supabase
    .from("orders")
    .update({
      collector_email: customerEmail,
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: stripePaymentIntentId,
      stripe_charge_id: stripeChargeId,
    })
    .eq("id", orderId)
    .eq("payment_status", "pending");

  if (updateOrderError) {
    // Check if order was already processed (idempotent)
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("payment_status")
      .eq("id", orderId)
      .single();

    if (existingOrder?.payment_status === "paid") {
      // Already processed — continue to inventory check
    } else {
      await markEventFailed(supabase, eventId, `Failed to update order: ${updateOrderError.message}`);
      return new Response(JSON.stringify({ error: "Processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Transition inventory RESERVED → SOLD
  const { data: soldArtworkId, error: soldError } = await supabase.rpc(
    "mark_artwork_sold",
    { p_reservation_token: reservationToken },
  );

  if (soldError || !soldArtworkId) {
    // mark_artwork_sold returned NULL — check current inventory state
    const { data: inventory, error: invError } = await supabase
      .from("artwork_inventory")
      .select("inventory_status, reservation_token")
      .eq("artwork_id", artworkId)
      .single();

    if (invError || !inventory) {
      await markEventFailed(supabase, eventId, `Inventory not found for artwork: ${artworkId}`);
      return new Response(JSON.stringify({ error: "Processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (inventory.inventory_status === "sold" && inventory.reservation_token === reservationToken) {
      // Idempotent success — artwork already sold with same reservation token
      await markEventProcessed(supabase, eventId);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Critical inconsistency — do NOT release artwork, do NOT mark processed
    const invState = `status=${inventory.inventory_status}, token_match=${inventory.reservation_token === reservationToken}`;
    await markEventFailed(supabase, eventId, `Inventory SOLD transition failed: ${invState}`);
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Success
  await markEventProcessed(supabase, eventId);
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleCheckoutExpired(
  event: Stripe.Event,
  supabase: ReturnType<typeof createClient>,
  eventId: string,
): Promise<Response> {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};
  const reservationToken = metadata.reservation_token;
  const orderId = metadata.order_id;

  if (!reservationToken) {
    await markEventFailed(supabase, eventId, "Missing reservation_token in metadata");
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Release the reservation
  await supabase.rpc("release_reservation", { p_reservation_token: reservationToken });

  // Update matching pending order to expired
  if (orderId) {
    await supabase
      .from("orders")
      .update({ payment_status: "expired" })
      .eq("id", orderId)
      .eq("payment_status", "pending");
  }

  await markEventProcessed(supabase, eventId);
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleChargeRefunded(
  event: Stripe.Event,
  supabase: ReturnType<typeof createClient>,
  eventId: string,
): Promise<Response> {
  const charge = event.data.object as Stripe.Charge;

  // Find the order using Stripe charge ID
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, total_cents, refunded_cents, payment_status")
    .eq("stripe_charge_id", charge.id)
    .single();

  if (orderError || !order) {
    // Try finding by payment intent ID
    const { data: orderByPi } = await supabase
      .from("orders")
      .select("id, total_cents, refunded_cents, payment_status")
      .eq("stripe_payment_intent_id", charge.payment_intent as string)
      .single();

    if (!orderByPi) {
      await markEventFailed(supabase, eventId, `Order not found for charge: ${charge.id}`);
      return new Response(JSON.stringify({ error: "Processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return processRefund(supabase, eventId, orderByPi.id, orderByPi.total_cents, charge.amount_refunded);
  }

  return processRefund(supabase, eventId, order.id, order.total_cents, charge.amount_refunded);
}

async function processRefund(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  orderId: string,
  totalCents: number,
  refundedAmount: number,
): Promise<Response> {
  const refundedCents = refundedAmount;
  let refundStatus: string;
  let paymentStatus: string;

  if (refundedCents >= totalCents) {
    refundStatus = "full";
    paymentStatus = "refunded";
  } else {
    refundStatus = "partial";
    paymentStatus = "partially_refunded";
  }

  await supabase
    .from("orders")
    .update({
      refunded_cents: refundedCents,
      refund_status: refundStatus,
      payment_status: paymentStatus,
    })
    .eq("id", orderId);

  await markEventProcessed(supabase, eventId);
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleDisputeCreated(
  event: Stripe.Event,
  supabase: ReturnType<typeof createClient>,
  eventId: string,
): Promise<Response> {
  const dispute = event.data.object as Stripe.Dispute;

  // Find the order using Stripe charge ID
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_charge_id", dispute.charge as string)
    .single();

  if (orderError || !order) {
    // Try finding by payment intent ID
    const { data: orderByPi } = await supabase
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", dispute.payment_intent as string)
      .single();

    if (!orderByPi) {
      await markEventFailed(supabase, eventId, `Order not found for dispute charge: ${dispute.charge}`);
      return new Response(JSON.stringify({ error: "Processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("orders")
      .update({ payment_status: "disputed" })
      .eq("id", orderByPi.id);

    await markEventProcessed(supabase, eventId);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase
    .from("orders")
    .update({ payment_status: "disputed" })
    .eq("id", order.id);

  await markEventProcessed(supabase, eventId);
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

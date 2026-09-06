import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InventoryRow {
  artwork_id: string;
  price_cents: number;
  currency: string;
  purchasable: boolean;
  inventory_status: string;
}

interface PublicAvailability {
  artwork_id: string;
  price_cents: number;
  currency: string;
  status: "available" | "unavailable";
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: releaseError } = await supabase.rpc("release_expired_reservations");
    if (releaseError) {
      console.error("release_expired_reservations failed:", releaseError.message);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("artwork_inventory")
      .select("artwork_id, price_cents, currency, purchasable, inventory_status");

    if (error) {
      console.error("inventory query failed:", error.message);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const availability: PublicAvailability[] = (data as InventoryRow[]).map((row) => ({
      artwork_id: row.artwork_id,
      price_cents: row.price_cents,
      currency: row.currency,
      status:
        row.purchasable && row.inventory_status === "available"
          ? "available"
          : "unavailable",
    }));

    return new Response(JSON.stringify(availability), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-commerce-availability error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

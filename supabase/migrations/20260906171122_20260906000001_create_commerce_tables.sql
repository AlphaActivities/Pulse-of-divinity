/*
# Create Commerce Database Foundation

## Purpose
This migration creates the secure, private database foundation for direct artwork commerce
on the Pulse of Divinity platform. It adds three new tables (artwork_inventory, orders,
stripe_webhook_events) alongside the existing CRM tables (admins, leads, lead_notes),
with Row Level Security enabled and zero public policies on all three.

No existing tables, functions, triggers, policies, or data are modified.

## Tables Created

### 1. artwork_inventory
Private transactional inventory table keyed by the existing canonical artwork IDs
from src/data/artworks.ts. Contains only commerce state — no presentation metadata.

- `artwork_id` (TEXT, PK) — matches canonical artwork ID (e.g., for-sale-cosmic-energy)
- `price_cents` (INTEGER, NOT NULL, CHECK > 0) — authoritative transactional price in cents
- `currency` (TEXT, NOT NULL, DEFAULT 'usd') — ISO currency code
- `purchasable` (BOOLEAN, NOT NULL, DEFAULT true) — master toggle for direct purchase
- `inventory_status` (TEXT, NOT NULL, DEFAULT 'available', CHECK IN available/reserved/sold)
- `reservation_token` (TEXT, UNIQUE, nullable) — server-generated reservation identifier
- `reservation_expires_at` (TIMESTAMPTZ, nullable) — when reservation expires
- `stripe_checkout_session_id` (TEXT, UNIQUE, nullable) — links to Stripe Checkout Session
- `sold_at` (TIMESTAMPTZ, nullable) — when artwork was confirmed sold
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now())

UNIQUE constraints on reservation_token and stripe_checkout_session_id allow multiple
NULLs (standard PostgreSQL behavior), so only non-NULL values are enforced unique.

### 2. orders
Private order/transaction table, completely separate from leads. Stores a transaction-time
snapshot of artwork and collector information so later artwork edits do not change historical
orders.

- `id` (UUID, PK, DEFAULT gen_random_uuid())
- `artwork_id` (TEXT, NOT NULL, FK to artwork_inventory) — links to inventory record
- `artwork_title_snapshot` (TEXT, NOT NULL) — title captured at transaction time
- `artwork_collection_snapshot` (TEXT, nullable) — collection captured at transaction time
- `artwork_price_cents` (INTEGER, NOT NULL, CHECK >= 0) — artwork price in cents at transaction
- `shipping_cents` (INTEGER, NOT NULL, DEFAULT 0, CHECK >= 0) — calculated shipping cost
- `tax_cents` (INTEGER, NOT NULL, DEFAULT 0, CHECK >= 0) — tax collected
- `total_cents` (INTEGER, NOT NULL, CHECK >= 0) — total charge amount
- `alpha_commission_cents` (INTEGER, NOT NULL, CHECK >= 0) — Alpha Systems 15% commission
- `refunded_cents` (INTEGER, NOT NULL, DEFAULT 0, CHECK >= 0) — cumulative amount refunded
- `currency` (TEXT, NOT NULL, DEFAULT 'usd')
- `stripe_checkout_session_id` (TEXT, UNIQUE, nullable)
- `stripe_payment_intent_id` (TEXT, nullable)
- `stripe_charge_id` (TEXT, nullable)
- `stripe_connected_account_id` (TEXT, NOT NULL) — Darcy's connected account ID
- `payment_status` (TEXT, NOT NULL, DEFAULT 'pending', CHECK IN pending/paid/failed/refunded/partially_refunded/disputed)
- `fulfillment_status` (TEXT, NOT NULL, DEFAULT 'unfulfilled', CHECK IN unfulfilled/preparing/shipped/delivered)
- `refund_status` (TEXT, NOT NULL, DEFAULT 'none', CHECK IN none/pending/partial/full)
- `collector_name` (TEXT, NOT NULL)
- `collector_email` (TEXT, NOT NULL)
- `collector_phone` (TEXT, nullable)
- `shipping_recipient_name` (TEXT, NOT NULL)
- `shipping_country` (TEXT, NOT NULL)
- `shipping_address_line1` (TEXT, NOT NULL)
- `shipping_address_line2` (TEXT, nullable)
- `shipping_city` (TEXT, NOT NULL)
- `shipping_state_region` (TEXT, NOT NULL)
- `shipping_postal_code` (TEXT, NOT NULL)
- `tracking_carrier` (TEXT, nullable)
- `tracking_number` (TEXT, nullable)
- `paid_at` (TIMESTAMPTZ, nullable)
- `shipped_at` (TIMESTAMPTZ, nullable)
- `delivered_at` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now())

No payment-card credentials, CVV, or Stripe secrets are stored.

### 3. stripe_webhook_events
Private webhook idempotency table for future Stripe webhook processing. Allows the
webhook handler to atomically claim an event before executing non-idempotent business
logic, and to distinguish processing, processed, and failed states.

- `stripe_event_id` (TEXT, PK) — Stripe's unique event identifier
- `event_type` (TEXT, NOT NULL) — Stripe event type
- `processing_status` (TEXT, NOT NULL, CHECK IN processing/processed/failed)
- `received_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now())
- `processed_at` (TIMESTAMPTZ, nullable) — when processing completed successfully
- `last_error` (TEXT, nullable) — error message if processing failed

## Indexes
- idx_artwork_inventory_status — on artwork_inventory(inventory_status)
- idx_artwork_inventory_reservation_expires_at — on artwork_inventory(reservation_expires_at)
- idx_orders_artwork_id — on orders(artwork_id)
- idx_orders_payment_status — on orders(payment_status)
- idx_orders_created_at — on orders(created_at DESC)

## Triggers
- trigger_artwork_inventory_updated_at — BEFORE UPDATE, calls existing update_updated_at_column()
- trigger_orders_updated_at — BEFORE UPDATE, calls existing update_updated_at_column()

## Functions (all SECURITY DEFINER, SET search_path = public, pg_temp)
All four functions have EXECUTE revoked from anon and authenticated. Only the service role
(used by edge functions) can invoke them.

1. reserve_artwork(p_artwork_id, p_reservation_token, p_reservation_minutes DEFAULT 30)
   — Atomic AVAILABLE to RESERVED transition. Returns artwork_id on success, NULL on failure.

2. release_expired_reservations()
   — Releases all reservations past their expiry back to AVAILABLE. Returns count.

3. release_reservation(p_reservation_token)
   — Releases a specific reservation back to AVAILABLE. Returns boolean.

4. mark_artwork_sold(p_reservation_token)
   — Converts RESERVED to SOLD after verified payment. Returns artwork_id on success, NULL.

## Security (RLS)
All three tables have RLS enabled with NO policies for anon or authenticated roles.
This means:
- Public/anon users CANNOT read, insert, update, or delete any commerce data directly
- Authenticated but unapproved users CANNOT read, insert, update, or delete any commerce data
- Only edge functions using the service role key (which bypasses RLS) can access these tables

## Initial Data
Two rows inserted into artwork_inventory:
- for-sale-cosmic-energy: 320000 cents ($3,200), usd, purchasable, available
- for-sale-bloom-through-the-breaking: 260000 cents ($2,600), usd, purchasable, available

Uses ON CONFLICT DO NOTHING for idempotency on re-run.

## Important Notes
1. This migration is purely additive — no existing tables, functions, triggers, or data modified.
2. The existing update_updated_at_column() function is reused as-is, not modified.
3. RLS is enabled but no policies are created — tables are completely locked from direct access.
4. The four SECURITY DEFINER functions are the only sanctioned mutation path for inventory state.
5. The webhook idempotency table is created but no webhook is implemented in this phase.
6. CHECK constraints (not ENUM types) are used for status fields so they can be expanded later.
*/

-- ============================================================
-- TABLE: artwork_inventory
-- ============================================================
CREATE TABLE IF NOT EXISTS public.artwork_inventory (
  artwork_id text PRIMARY KEY,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  purchasable boolean NOT NULL DEFAULT true,
  inventory_status text NOT NULL DEFAULT 'available'
    CHECK (inventory_status IN ('available', 'reserved', 'sold')),
  reservation_token text UNIQUE,
  reservation_expires_at timestamptz,
  stripe_checkout_session_id text UNIQUE,
  sold_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artwork_inventory ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id text NOT NULL REFERENCES public.artwork_inventory(artwork_id),
  artwork_title_snapshot text NOT NULL,
  artwork_collection_snapshot text,
  artwork_price_cents integer NOT NULL CHECK (artwork_price_cents >= 0),
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  tax_cents integer NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  alpha_commission_cents integer NOT NULL CHECK (alpha_commission_cents >= 0),
  refunded_cents integer NOT NULL DEFAULT 0 CHECK (refunded_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_connected_account_id text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'disputed')),
  fulfillment_status text NOT NULL DEFAULT 'unfulfilled'
    CHECK (fulfillment_status IN ('unfulfilled', 'preparing', 'shipped', 'delivered')),
  refund_status text NOT NULL DEFAULT 'none'
    CHECK (refund_status IN ('none', 'pending', 'partial', 'full')),
  collector_name text NOT NULL,
  collector_email text NOT NULL,
  collector_phone text,
  shipping_recipient_name text NOT NULL,
  shipping_country text NOT NULL,
  shipping_address_line1 text NOT NULL,
  shipping_address_line2 text,
  shipping_city text NOT NULL,
  shipping_state_region text NOT NULL,
  shipping_postal_code text NOT NULL,
  tracking_carrier text,
  tracking_number text,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: stripe_webhook_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processing_status text NOT NULL
    CHECK (processing_status IN ('processing', 'processed', 'failed')),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error text
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_artwork_inventory_status
  ON public.artwork_inventory(inventory_status);

CREATE INDEX IF NOT EXISTS idx_artwork_inventory_reservation_expires_at
  ON public.artwork_inventory(reservation_expires_at);

CREATE INDEX IF NOT EXISTS idx_orders_artwork_id
  ON public.orders(artwork_id);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders(created_at DESC);

-- ============================================================
-- TRIGERS (reuse existing update_updated_at_column function)
-- ============================================================
DROP TRIGGER IF EXISTS trigger_artwork_inventory_updated_at ON public.artwork_inventory;
CREATE TRIGGER trigger_artwork_inventory_updated_at
  BEFORE UPDATE ON public.artwork_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- FUNCTION: reserve_artwork
-- Atomic AVAILABLE -> RESERVED transition.
-- Returns artwork_id on success, NULL if artwork not available/purchasable.
-- ============================================================
CREATE OR REPLACE FUNCTION public.reserve_artwork(
  p_artwork_id text,
  p_reservation_token text,
  p_reservation_minutes integer DEFAULT 30
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_artwork_id text;
BEGIN
  UPDATE public.artwork_inventory
  SET inventory_status = 'reserved',
      reservation_token = p_reservation_token,
      reservation_expires_at = now() + make_interval(mins => p_reservation_minutes)
  WHERE artwork_id = p_artwork_id
    AND inventory_status = 'available'
    AND purchasable = true
  RETURNING artwork_id INTO v_artwork_id;

  RETURN v_artwork_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_artwork(text, text, integer) FROM anon, authenticated;

-- ============================================================
-- FUNCTION: release_expired_reservations
-- Releases all reservations past their expiry back to AVAILABLE.
-- Returns count of released reservations.
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.artwork_inventory
  SET inventory_status = 'available',
      reservation_token = NULL,
      reservation_expires_at = NULL,
      stripe_checkout_session_id = NULL
  WHERE inventory_status = 'reserved'
    AND reservation_expires_at IS NOT NULL
    AND reservation_expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_expired_reservations() FROM anon, authenticated;

-- ============================================================
-- FUNCTION: release_reservation
-- Releases a specific reservation back to AVAILABLE.
-- Returns true if a reservation was released, false if not found.
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_reservation(
  p_reservation_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_artwork_id text;
BEGIN
  UPDATE public.artwork_inventory
  SET inventory_status = 'available',
      reservation_token = NULL,
      reservation_expires_at = NULL,
      stripe_checkout_session_id = NULL
  WHERE reservation_token = p_reservation_token
    AND inventory_status = 'reserved'
  RETURNING artwork_id INTO v_artwork_id;

  RETURN v_artwork_id IS NOT NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_reservation(text) FROM anon, authenticated;

-- ============================================================
-- FUNCTION: mark_artwork_sold
-- Converts RESERVED -> SOLD after verified Stripe payment.
-- Returns artwork_id on success, NULL if reservation not found.
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_artwork_sold(
  p_reservation_token text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_artwork_id text;
BEGIN
  UPDATE public.artwork_inventory
  SET inventory_status = 'sold',
      sold_at = now(),
      reservation_expires_at = NULL
  WHERE reservation_token = p_reservation_token
    AND inventory_status = 'reserved'
  RETURNING artwork_id INTO v_artwork_id;

  RETURN v_artwork_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_artwork_sold(text) FROM anon, authenticated;

-- ============================================================
-- INITIAL INVENTORY DATA (idempotent)
-- ============================================================
INSERT INTO public.artwork_inventory (artwork_id, price_cents, currency, purchasable, inventory_status)
VALUES
  ('for-sale-cosmic-energy', 320000, 'usd', true, 'available'),
  ('for-sale-bloom-through-the-breaking', 260000, 'usd', true, 'available')
ON CONFLICT (artwork_id) DO NOTHING;

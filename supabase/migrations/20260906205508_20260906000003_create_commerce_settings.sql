-- ============================================================
-- Phase 5A-1: Commerce Settings Foundation
--
-- Creates a typed single-row settings table for commerce configuration.
-- Stores: Stripe connected account ID, US shipping rate, Canada shipping rate.
-- All values initialized to NULL (not yet configured).
--
-- Security: RLS enabled, zero public policies. Service-role only.
--
-- Does NOT modify any existing table, function, trigger, or policy.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commerce_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  stripe_connected_account_id text,
  shipping_rate_us_cents integer CHECK (
    shipping_rate_us_cents IS NULL OR shipping_rate_us_cents > 0
  ),
  shipping_rate_ca_cents integer CHECK (
    shipping_rate_ca_cents IS NULL OR shipping_rate_ca_cents > 0
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. INITIAL ROW (all NULL — nothing configured yet)
-- ------------------------------------------------------------
INSERT INTO public.commerce_settings (id, stripe_connected_account_id, shipping_rate_us_cents, shipping_rate_ca_cents)
VALUES (1, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 3. RLS — enabled, zero policies (service-role only)
-- ------------------------------------------------------------
ALTER TABLE public.commerce_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 4. TRIGGER — reuse existing update_updated_at_column() function
--    Do NOT modify the existing function.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_commerce_settings_updated_at ON public.commerce_settings;
CREATE TRIGGER trigger_commerce_settings_updated_at
  BEFORE UPDATE ON public.commerce_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Phase 5A-2A Migration 3: Collector Email Nullable + Webhook Attempt Time
--
-- 1. Make orders.collector_email nullable so pending orders can be
--    created before Stripe Checkout collects the email.
-- 2. Add state-aware CHECK: paid/refunded/disputed orders MUST have
--    collector_email; pending/failed/expired orders MAY have NULL.
-- 3. Add processing_started_at to stripe_webhook_events for atomic
--    webhook claim/retry/reclaim logic.
--
-- No existing rows are deleted or modified.
-- received_at remains unchanged as original first receipt time.
-- ============================================================

-- 1. Make collector_email nullable
ALTER TABLE public.orders ALTER COLUMN collector_email DROP NOT NULL;

-- 2. State-aware email CHECK constraint (idempotent)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_collector_email_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_collector_email_check
  CHECK (
    (
      payment_status IN (
        'paid',
        'refunded',
        'partially_refunded',
        'disputed'
      )
      AND collector_email IS NOT NULL
    )
    OR
    payment_status IN (
      'pending',
      'failed',
      'expired'
    )
  );

-- 3. Webhook processing attempt timestamp
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

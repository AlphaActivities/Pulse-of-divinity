-- ============================================================
-- Phase 5A-2A Migration 2: Expired Payment Status
--
-- Replaces the orders.payment_status CHECK constraint to add
-- 'expired' as an allowed value. All existing values remain.
-- No existing rows are modified.
-- ============================================================

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN (
    'pending',
    'paid',
    'failed',
    'refunded',
    'partially_refunded',
    'disputed',
    'expired'
  ));

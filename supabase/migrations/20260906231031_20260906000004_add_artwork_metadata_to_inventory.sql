-- ============================================================
-- Phase 5A-2A Migration 1: Trusted Artwork Transaction Metadata
--
-- Adds minimal title/collection columns to artwork_inventory
-- for durable order snapshots. These are transactional identity
-- fields only — rich editorial metadata remains in src/data/artworks.ts.
--
-- No existing columns modified. No existing data changed.
-- ============================================================

ALTER TABLE public.artwork_inventory
  ADD COLUMN IF NOT EXISTS artwork_title text;

ALTER TABLE public.artwork_inventory
  ADD COLUMN IF NOT EXISTS artwork_collection text;

-- Populate known artwork metadata (idempotent)
UPDATE public.artwork_inventory
SET artwork_title = 'Cosmic Energy',
    artwork_collection = 'for-sale'
WHERE artwork_id = 'for-sale-cosmic-energy';

UPDATE public.artwork_inventory
SET artwork_title = 'Bloom Through the Breaking',
    artwork_collection = 'for-sale'
WHERE artwork_id = 'for-sale-bloom-through-the-breaking';

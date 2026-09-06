import { useEffect, useState } from 'react';
import { availableWorks } from '../data/artworks';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const COMMERCE_TIMEOUT_MS = 10000;

export type CommerceStatus = 'available' | 'unavailable';

export interface CommerceAvailability {
  artwork_id: string;
  price_cents: number;
  currency: string;
  status: CommerceStatus;
}

export type CommerceAvailabilityMap = Record<string, CommerceAvailability>;

export interface UseCommerceAvailabilityResult {
  availability: CommerceAvailabilityMap | null;
  loading: boolean;
  error: string | null;
}

function isValidRecord(value: unknown): value is CommerceAvailability {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.artwork_id === 'string' &&
    typeof r.price_cents === 'number' &&
    typeof r.currency === 'string' &&
    (r.status === 'available' || r.status === 'unavailable')
  );
}

function buildMap(records: unknown[]): CommerceAvailabilityMap {
  const map: CommerceAvailabilityMap = {};
  for (const record of records) {
    if (isValidRecord(record)) {
      map[record.artwork_id] = {
        artwork_id: record.artwork_id,
        price_cents: record.price_cents,
        currency: record.currency,
        status: record.status,
      };
    }
  }
  return map;
}

function checkPriceDrift(map: CommerceAvailabilityMap): void {
  if (!import.meta.env.DEV) return;
  for (const artwork of availableWorks) {
    const commerce = map[artwork.id];
    if (!commerce || artwork.priceNumeric === null) continue;
    const displayCents = artwork.priceNumeric * 100;
    if (displayCents !== commerce.price_cents) {
      console.warn(
        `[Commerce] Price drift for "${artwork.id}": artworks.ts = ${displayCents} cents, API = ${commerce.price_cents} cents`,
      );
    }
  }
}

export function useCommerceAvailability(): UseCommerceAvailabilityResult {
  const [availability, setAvailability] = useState<CommerceAvailabilityMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), COMMERCE_TIMEOUT_MS);

    fetch(`${SUPABASE_URL}/functions/v1/get-commerce-availability`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: unknown = await res.json();
        if (!Array.isArray(json)) throw new Error('Response is not an array');
        const map = buildMap(json);
        setAvailability(map);
        setLoading(false);
        checkPriceDrift(map);
      })
      .catch((err: unknown) => {
        if (import.meta.env.DEV) {
          console.warn('[Commerce] Availability fetch failed:', err instanceof Error ? err.message : err);
        }
        setError('unavailable');
        setAvailability(null);
        setLoading(false);
      })
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return { availability, loading, error };
}

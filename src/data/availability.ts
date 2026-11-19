import { availableWorks } from './artworks';

export type ArtworkAvailability = 'available' | 'reserved' | 'sold';
export interface PublicAvailability {
  artwork_id: string;
  price_cents: number;
  currency: string;
  status: ArtworkAvailability;
}
export interface InventoryItem {
  artwork_id: string;
  inventory_status: ArtworkAvailability;
  updated_at: string;
}
const approvedIds = new Set(availableWorks.map(work => work.id));
const isStatus = (value: unknown): value is ArtworkAvailability =>
  value === 'available' || value === 'reserved' || value === 'sold';
function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function parsePublicAvailability(value: unknown): Record<string, PublicAvailability> {
  if (!Array.isArray(value)) throw new Error('Invalid availability response');
  const result: Record<string, PublicAvailability> = {};
  const seen = new Set<string>();
  for (const entry of value) {
    const row = record(entry);
    if (!row || typeof row.artwork_id !== 'string' || !approvedIds.has(row.artwork_id)) continue;
    // Conflicting rows can never establish a confirmed public state.
    if (seen.has(row.artwork_id)) throw new Error('Duplicate artwork availability');
    seen.add(row.artwork_id);
    if (!isStatus(row.status) || typeof row.price_cents !== 'number' ||
      !Number.isSafeInteger(row.price_cents) || row.price_cents <= 0 ||
      typeof row.currency !== 'string' || !/^[a-z]{3}$/.test(row.currency)) continue;
    result[row.artwork_id] = {
      artwork_id: row.artwork_id, status: row.status,
      price_cents: row.price_cents, currency: row.currency,
    };
  }
  return result;
}

export function parseInventoryItem(value: unknown): InventoryItem {
  const row = record(value);
  if (!row || typeof row.artwork_id !== 'string' || !approvedIds.has(row.artwork_id) ||
    !isStatus(row.inventory_status) || typeof row.updated_at !== 'string' ||
    !Number.isFinite(Date.parse(row.updated_at))) throw new Error('Availability could not be verified. Please refresh.');
  return { artwork_id: row.artwork_id, inventory_status: row.inventory_status, updated_at: row.updated_at };
}

export function parseInventory(value: unknown): InventoryItem[] {
  if (!Array.isArray(value)) throw new Error('Availability could not be verified. Please refresh.');
  const seen = new Set<string>();
  return value.map(parseInventoryItem).map(row => {
    if (seen.has(row.artwork_id)) throw new Error('Conflicting availability records. Please refresh.');
    seen.add(row.artwork_id);
    return row;
  });
}

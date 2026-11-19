import { describe, expect, it } from 'vitest';
import { parseInventory, parseInventoryItem, parsePublicAvailability } from '../src/data/availability';
const id = 'for-sale-cosmic-energy';
const publicRow = { artwork_id: id, status: 'sold', price_cents: 320000, currency: 'usd' };
const privateRow = { artwork_id: id, inventory_status: 'reserved', updated_at: '2026-11-19T00:00:00.123456Z' };
describe('verified availability contracts', () => {
  it.each(['available', 'reserved', 'sold'])('keeps the confirmed %s state', status => {
    expect(parsePublicAvailability([{ ...publicRow, status }])[id].status).toBe(status);
  });
  it('does not confirm absent, malformed, legacy or unapproved public rows', () => {
    for (const row of [null, {...publicRow,status:'unavailable'}, {...publicRow,price_cents:-1},
      {...publicRow,price_cents:NaN}, {...publicRow,currency:''}, {...publicRow,artwork_id:'unapproved'}]) {
      expect(parsePublicAvailability([row])).toEqual({});
    }
    expect(parsePublicAvailability([])).toEqual({});
    expect(() => parsePublicAvailability({})).toThrow();
  });
  it('fails closed on conflicting duplicates, regardless of ordering', () => {
    for (const rows of [[publicRow,{...publicRow,status:'available'}],[{...publicRow,status:'available'},publicRow]]) {
      expect(() => parsePublicAvailability(rows)).toThrow(/Duplicate/);
    }
  });
  it('strips private fields and preserves the exact concurrency timestamp', () => {
    expect(parseInventoryItem({...privateRow,reservation_token:'private-fixture'})).toEqual(privateRow);
    expect(parsePublicAvailability([{...publicRow,reservation_token:'private-fixture'}])[id]).toEqual(publicRow);
  });
  it('rejects empty/mismatched inventory response shapes and invalid timestamps', () => {
    for (const row of [{},null,[],{...privateRow,inventory_status:'unavailable'},
      {...privateRow,updated_at:'invalid'},{...privateRow,artwork_id:'unknown'}]) {
      expect(() => parseInventoryItem(row)).toThrow();
    }
    expect(() => parseInventory({})).toThrow();
    expect(() => parseInventory([privateRow,privateRow])).toThrow(/Conflicting/);
  });
});

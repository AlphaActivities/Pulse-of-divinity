import { describe, expect, it, vi } from 'vitest';
import { submitInquiry } from '../src/utils/submitInquiry';
const id = '6e5e63c6-2d35-43c6-a734-e3cf065ac49c';
describe('inquiry commitment', () => {
  it('requires a committed inquiry ID, including duplicates', async () => {
    for (const duplicate of [false, true]) {
      const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({success:true,id,duplicate}), {status:duplicate?200:201}));
      expect(await submitInquiry({submissionId:'stable-request-key'}, request)).toBe(id);
      expect(JSON.parse(request.mock.calls[0][1].body).submissionId).toBe('stable-request-key');
    }
  });
  it('rejects failure, a missing ID, invalid ID, and unconfirmed HTTP 200', async () => {
    for (const [status, body] of [[500,{}],[200,{success:true}],[200,{success:true,id:'undefined'}],[200,{id}]] as const) {
      await expect(submitInquiry({}, vi.fn().mockResolvedValue(new Response(JSON.stringify(body),{status})))).rejects.toThrow();
    }
  });
  it('rejects a network failure for the caller to retain and retry', async () => {
    await expect(submitInquiry({},vi.fn().mockRejectedValue(new Error('offline')))).rejects.toThrow('offline');
  });
});

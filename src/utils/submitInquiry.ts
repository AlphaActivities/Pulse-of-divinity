export async function submitInquiry(payload: Record<string, unknown>, request = fetch): Promise<string> {
  const response = await request(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || result.success !== true || typeof result.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.id)) {
    throw new Error('Inquiry save was not confirmed');
  }
  return result.id;
}

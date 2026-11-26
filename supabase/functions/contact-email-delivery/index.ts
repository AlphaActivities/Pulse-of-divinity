import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

async function authorized(supplied: string | null) {
  const expected = Deno.env.get('PUSH_DISPATCH_KEY');
  if (!supplied || !expected || expected.length < 32) return false;
  const digest = async (value: string) =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [left, right] = await Promise.all([digest(supplied), digest(expected)]);
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({}, {status: 405});
  if (request.headers.has('Origin') || !await authorized(request.headers.get('x-pod-dispatch-key'))) {
    return Response.json({}, {status: 403});
  }

  const key = Deno.env.get('RESEND_API_KEY');
  const cutoff = Deno.env.get('CONTACT_EMAIL_DELIVER_AFTER');
  const recipients = (Deno.env.get('CONTACT_EMAIL_RECIPIENTS') ?? '').split(',')
    .map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (Deno.env.get('CONTACT_EMAIL_ENABLED') !== 'true' || !key ||
      !cutoff || !Number.isFinite(Date.parse(cutoff)) || !recipients.length) {
    return Response.json({error: 'Contact email is disabled.'}, {status: 503});
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data, error} = await db.rpc('pod_claim_contact_emails', {p_cutoff: cutoff, p_recipients: recipients});
  if (error) return Response.json({error: 'Could not claim contact email.'}, {status: 500});

  let accepted = 0;
  for (const claim of data ?? []) {
    let delivered = false;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(4000),
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `pod-contact/${claim.event_id}/${claim.admin_id}`,
        },
        body: JSON.stringify({
          from: 'Pulse of Divinity CRM <notifications@pulseofdivinity.com>',
          to: [claim.email],
          subject: 'New Pulse of Divinity inquiry',
          text: 'A new website inquiry is available in the Pulse of Divinity CRM.',
        }),
      });
      delivered = response.ok;
      await response.body?.cancel();
    } catch {
      // Reclaim failed and interrupted sends within the bounded delivery window.
    }
    if (delivered) accepted++;
    const {error: updateError} = await db.from('contact_email_deliveries')
      .update({status: delivered ? 'accepted' : 'failed'})
      .eq('event_id', claim.event_id).eq('admin_id', claim.admin_id);
    if (updateError) return Response.json({error: 'Could not record contact delivery.'}, {status: 500});
  }
  return Response.json({accepted, claimed: data?.length ?? 0});
});

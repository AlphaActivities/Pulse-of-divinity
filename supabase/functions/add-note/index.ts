import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_NOTE_LENGTH = 5000;
const EMAIL_TIMEOUT_MS = 10000;

const RESEND_API_URL = "https://api.resend.com/emails";

const SENDER_BRANDED = "Pulse of Divinity CRM <notifications@pulseofdivinity.com>";

const NOTE_RECIPIENTS = [
  "darcy.pulseofdivinity@gmail.com",
  "yourcustomerflowguy@gmail.com",
  "heberherrera92@gmail.com",
];

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  ACTIVE_CONVERSATION: "Active Conversation",
  FOLLOW_UP: "Follow-Up",
  QUALIFIED: "Qualified",
  WON: "Won",
  CLOSED: "Closed",
};

const INQUIRY_LABELS: Record<string, string> = {
  available_work: "Artwork Inquiry",
  commission: "Commission Inquiry",
  general: "General Inquiry",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildHtmlEmail(params: {
  leadName: string;
  inquiryType: string;
  artworkTitle: string | null;
  status: string;
  authorName: string;
  createdAt: string;
  noteBody: string;
}): string {
  const collectorName = escapeHtml(params.leadName);
  const inquiryLabel = INQUIRY_LABELS[params.inquiryType] || params.inquiryType;
  const statusLabel = STATUS_LABELS[params.status] || params.status;
  const author = escapeHtml(params.authorName);
  const timestamp = formatDateTime(params.createdAt);
  const noteHtml = escapeHtml(params.noteBody).replace(/\n/g, "<br />");
  const artworkRow = params.artworkTitle
    ? `<tr><td class="label">ARTWORK</td><td class="value">${escapeHtml(params.artworkTitle)}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Internal Note — ${collectorName} | Pulse of Divinity</title>
</head>
<body style="margin:0;padding:0;background-color:#1a0f1a;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#1a0f1a;">
<tr><td align="center" style="padding:32px 16px;">

<table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background-color:#221623;border:1px solid rgba(201,162,39,0.15);border-radius:4px;overflow:hidden;">

<tr><td style="padding:28px 32px 20px;border-bottom:1px solid rgba(201,162,39,0.12);">
<div style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:13px;font-weight:400;letter-spacing:0.22em;color:#c9a227;text-transform:uppercase;">Pulse of Divinity</div>
<div style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:300;letter-spacing:0.15em;color:rgba(250,243,217,0.4);text-transform:uppercase;margin-top:4px;">Collector Intelligence</div>
</td></tr>

<tr><td style="padding:24px 32px 8px;">
<p style="font-family:Georgia,serif;font-size:15px;font-weight:400;color:#faf3d9;margin:0;line-height:1.6;">A new internal note has been added.</p>
</td></tr>

<tr><td style="padding:16px 32px 24px;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td class="label" style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.12em;color:rgba(201,162,39,0.6);text-transform:uppercase;padding:8px 0 4px;width:140px;">COLLECTOR</td><td class="value" style="font-family:Georgia,serif;font-size:14px;color:#faf3d9;padding:8px 0 4px;">${collectorName}</td></tr>
<tr><td class="label" style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.12em;color:rgba(201,162,39,0.6);text-transform:uppercase;padding:8px 0 4px;width:140px;">INQUIRY</td><td class="value" style="font-family:Georgia,serif;font-size:14px;color:rgba(250,243,217,0.8);padding:8px 0 4px;">${escapeHtml(inquiryLabel)}</td></tr>
${artworkRow}
<tr><td class="label" style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.12em;color:rgba(201,162,39,0.6);text-transform:uppercase;padding:8px 0 4px;width:140px;">CURRENT STATUS</td><td class="value" style="font-family:Georgia,serif;font-size:14px;color:rgba(250,243,217,0.8);padding:8px 0 4px;">${escapeHtml(statusLabel)}</td></tr>
<tr><td class="label" style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.12em;color:rgba(201,162,39,0.6);text-transform:uppercase;padding:8px 0 4px;width:140px;">NOTE ADDED BY</td><td class="value" style="font-family:Georgia,serif;font-size:14px;color:rgba(250,243,217,0.8);padding:8px 0 4px;">${author}</td></tr>
<tr><td class="label" style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.12em;color:rgba(201,162,39,0.6);text-transform:uppercase;padding:8px 0 4px;width:140px;">DATE / TIME</td><td class="value" style="font-family:Georgia,serif;font-size:14px;color:rgba(250,243,217,0.8);padding:8px 0 4px;">${escapeHtml(timestamp)}</td></tr>
</table>
</td></tr>

<tr><td style="padding:0 32px 8px;">
<div style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.12em;color:rgba(201,162,39,0.6);text-transform:uppercase;margin-bottom:8px;">Internal Note</div>
<div style="background-color:rgba(26,15,26,0.5);border:1px solid rgba(201,162,39,0.10);border-radius:3px;padding:16px 18px;">
<p style="font-family:Georgia,serif;font-size:14px;color:#faf3d9;margin:0;line-height:1.7;">${noteHtml}</p>
</div>
</td></tr>

<tr><td align="center" style="padding:28px 32px 8px;">
<a href="https://pulseofdivinity.com/admin/leads" style="display:inline-block;font-family:'Jost',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;letter-spacing:0.15em;text-transform:uppercase;color:#c9a227;text-decoration:none;border:1px solid rgba(201,162,39,0.35);border-radius:3px;padding:12px 32px;">Open Collector Intelligence</a>
</td></tr>

<tr><td style="padding:20px 32px 28px;border-top:1px solid rgba(201,162,39,0.08);">
<p style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:300;color:rgba(250,243,217,0.3);margin:0;line-height:1.5;text-align:center;">Internal notification for authorized Pulse of Divinity administrators.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildTextEmail(params: {
  leadName: string;
  inquiryType: string;
  artworkTitle: string | null;
  status: string;
  authorName: string;
  createdAt: string;
  noteBody: string;
}): string {
  const inquiryLabel = INQUIRY_LABELS[params.inquiryType] || params.inquiryType;
  const statusLabel = STATUS_LABELS[params.status] || params.status;
  const timestamp = formatDateTime(params.createdAt);
  const artworkLine = params.artworkTitle ? `Artwork: ${params.artworkTitle}\n` : "";

  return `PULSE OF DIVINITY
Collector Intelligence

A new internal note has been added.

Collector: ${params.leadName}
Inquiry: ${inquiryLabel}
${artworkLine}Current Status: ${statusLabel}
Note Added By: ${params.authorName}
Date / Time: ${timestamp}

Internal Note:
${params.noteBody}

Open Collector Intelligence:
https://pulseofdivinity.com/admin/leads

Internal notification for authorized Pulse of Divinity administrators.`;
}

async function sendNoteNotification(params: {
  leadName: string;
  inquiryType: string;
  artworkTitle: string | null;
  status: string;
  authorName: string;
  createdAt: string;
  noteBody: string;
  noteId: string;
  leadId: string;
}): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("note-email: RESEND_API_KEY not configured", {
      noteId: params.noteId,
      leadId: params.leadId,
    });
    return;
  }

  const subject = `New Internal Note — ${params.leadName} | Pulse of Divinity`;
  const sender = SENDER_BRANDED;
  const html = buildHtmlEmail(params);
  const text = buildTextEmail(params);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: NOTE_RECIPIENTS[0],
        bcc: NOTE_RECIPIENTS.slice(1),
        subject,
        html,
        text,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("note-email: Resend API error", {
        noteId: params.noteId,
        leadId: params.leadId,
        httpStatus: response.status,
      });
    }
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    console.error("note-email: send failed", {
      noteId: params.noteId,
      leadId: params.leadId,
      error: isTimeout ? "timeout" : "network_error",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function verifyAdmin(
  supabase: ReturnType<typeof createClient>,
  token: string,
): Promise<{ authorized: boolean; adminId: string | null }> {
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { authorized: false, adminId: null };
  const { data: admin } = await supabase
    .from("admins")
    .select("id, active")
    .eq("auth_user_id", userData.user.id)
    .single();
  if (!admin || !admin.active) return { authorized: false, adminId: null };
  return { authorized: true, adminId: admin.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { authorized, adminId } = await verifyAdmin(supabase, token);
    if (!authorized || !adminId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const leadId = body.lead_id;

    if (!leadId || typeof leadId !== "string" || leadId.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid lead ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm lead exists and fetch safe fields for notification
    const { data: lead } = await supabase
      .from("leads")
      .select("id, name, inquiry_type, artwork_title, status")
      .eq("id", leadId)
      .single();
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const noteText = typeof body.body === "string" ? body.body.trim() : "";
    if (!noteText) {
      return new Response(JSON.stringify({ error: "Note cannot be empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (noteText.length > MAX_NOTE_LENGTH) {
      return new Response(JSON.stringify({ error: "Note exceeds maximum length of 5000 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Author is derived from the authenticated admin identity — never from frontend
    const { data: note, error } = await supabase
      .from("lead_notes")
      .insert({
        lead_id: leadId,
        author_admin_id: adminId,
        body: noteText,
      })
      .select("id, lead_id, body, author_admin_id, created_at")
      .single();

    if (error || !note) {
      return new Response(JSON.stringify({ error: "Unable to add note" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch author display name
    const { data: admin } = await supabase
      .from("admins")
      .select("display_name")
      .eq("id", adminId)
      .single();

    const authorName = admin?.display_name ?? "Admin";

    // Fire-and-forget email notification — never blocks or fails the note response
    sendNoteNotification({
      leadName: lead.name,
      inquiryType: lead.inquiry_type,
      artworkTitle: lead.artwork_title,
      status: lead.status,
      authorName,
      createdAt: note.created_at,
      noteBody: noteText,
      noteId: note.id,
      leadId: leadId,
    }).catch((err) => {
      console.error("note-email: uncaught notification error", {
        noteId: note.id,
        leadId: leadId,
        error: err instanceof Error ? err.message : "unknown",
      });
    });

    return new Response(
      JSON.stringify({
        ...note,
        author_name: admin?.display_name ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("add-note error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

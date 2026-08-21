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
const DASHBOARD_URL = "https://pulseofdivinity.com/admin/leads";

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

const STATUS_COLORS: Record<string, string> = {
  NEW: "#63C98B",
  CONTACTED: "#62C7C0",
  ACTIVE_CONVERSATION: "#B28ADB",
  FOLLOW_UP: "#DDAE52",
  QUALIFIED: "#7DA7E8",
  WON: "#F0D784",
  CLOSED: "#B98291",
};

const INQUIRY_LABELS: Record<string, string> = {
  available_work: "Artwork Inquiry",
  commission: "Commission Inquiry",
  general: "General Inquiry",
};

const CONTACT_METHOD_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  text: "Text Message",
};

interface PreviousNote {
  body: string;
  author_name: string | null;
  created_at: string;
}

interface LeadContext {
  name: string;
  email: string;
  phone: string | null;
  contact_method: string;
  inquiry_type: string;
  interest: string;
  artwork_title: string | null;
  status: string;
  follow_up_at: string | null;
  created_at: string;
}

interface EmailParams {
  lead: LeadContext;
  authorName: string;
  noteBody: string;
  noteCreatedAt: string;
  noteId: string;
  leadId: string;
  previousNotes: PreviousNote[];
}

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(followUpAt: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followUp = new Date(followUpAt);
  followUp.setHours(0, 0, 0, 0);
  return followUp < today;
}

function getInterestDisplay(lead: LeadContext): string | null {
  if (lead.inquiry_type === "available_work" && lead.artwork_title) {
    return lead.artwork_title;
  }
  if (lead.inquiry_type === "commission") {
    return "Commission Inquiry";
  }
  if (lead.interest) {
    return lead.interest;
  }
  if (lead.artwork_title) {
    return lead.artwork_title;
  }
  return null;
}

function buildSubject(lead: LeadContext): string {
  const statusLabel = STATUS_LABELS[lead.status] || null;
  if (lead.name && statusLabel) {
    return `New CRM Note — ${lead.name} · ${statusLabel} | Pulse of Divinity`;
  }
  if (lead.name) {
    return `New CRM Note — ${lead.name} | Pulse of Divinity`;
  }
  return "New CRM Note | Pulse of Divinity";
}

function snapshotRow(label: string, valueHtml: string): string {
  return `<tr><td style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.12em;color:rgba(201,162,39,0.6);text-transform:uppercase;padding:7px 0 5px;width:150px;vertical-align:top;">${label}</td><td style="font-family:Georgia,serif;font-size:14px;color:rgba(250,243,217,0.85);padding:7px 0 5px;vertical-align:top;">${valueHtml}</td></tr>`;
}

function buildHtmlEmail(params: EmailParams): string {
  const { lead, authorName, noteBody, noteCreatedAt, previousNotes } = params;
  const statusLabel = STATUS_LABELS[lead.status] || lead.status;
  const statusColor = STATUS_COLORS[lead.status] || "#faf3d9";
  const inquiryLabel = INQUIRY_LABELS[lead.inquiry_type] || lead.inquiry_type;
  const contactLabel = CONTACT_METHOD_LABELS[lead.contact_method] || lead.contact_method;
  const interestDisplay = getInterestDisplay(lead);
  const noteHtml = escapeHtml(noteBody).replace(/\n/g, "<br />");
  const noteTimestamp = formatDateTime(noteCreatedAt);
  const leadReceived = formatDate(lead.created_at);

  const emailLink = lead.email
    ? `<a href="mailto:${escapeHtml(lead.email)}" style="color:#faf3d9;text-decoration:none;border-bottom:1px solid rgba(201,162,39,0.25);">${escapeHtml(lead.email)}</a>`
    : null;

  const phoneLink = lead.phone
    ? `<a href="tel:${escapeHtml(lead.phone.replace(/[^0-9+]/g, ""))}" style="color:#faf3d9;text-decoration:none;border-bottom:1px solid rgba(201,162,39,0.25);">${escapeHtml(lead.phone)}</a>`
    : null;

  let followUpHtml: string | null = null;
  if (lead.follow_up_at) {
    const followUpDate = formatDate(lead.follow_up_at);
    const overdue = isOverdue(lead.follow_up_at);
    followUpHtml = overdue
      ? `${escapeHtml(followUpDate)} <span style="display:inline-block;margin-left:8px;font-family:'Jost',Helvetica,Arial,sans-serif;font-size:9px;font-weight:400;letter-spacing:0.1em;text-transform:uppercase;color:#C87872;border:1px solid rgba(200,120,114,0.3);border-radius:2px;padding:2px 7px;">Overdue</span>`
      : escapeHtml(followUpDate);
  }

  const snapshotRows: string[] = [];
  snapshotRows.push(snapshotRow("Collector", escapeHtml(lead.name)));
  if (emailLink) snapshotRows.push(snapshotRow("Email", emailLink));
  if (phoneLink) snapshotRows.push(snapshotRow("Phone", phoneLink));
  snapshotRows.push(snapshotRow("Preferred Contact", escapeHtml(contactLabel)));
  snapshotRows.push(snapshotRow("Inquiry Type", escapeHtml(inquiryLabel)));
  if (interestDisplay) snapshotRows.push(snapshotRow("Interest / Artwork", escapeHtml(interestDisplay)));
  snapshotRows.push(
    snapshotRow(
      "Current Status",
      `<span style="display:inline-block;font-family:'Jost',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;letter-spacing:0.08em;text-transform:uppercase;color:${statusColor};border:1px solid ${statusColor}40;border-radius:2px;padding:3px 10px;background-color:${statusColor}12;">${escapeHtml(statusLabel)}</span>`,
    ),
  );
  if (followUpHtml) snapshotRows.push(snapshotRow("Follow-Up", followUpHtml));
  snapshotRows.push(snapshotRow("Lead Received", escapeHtml(leadReceived)));

  const recentContextHtml =
    previousNotes.length > 0
      ? `<tr><td style="padding:8px 32px 4px;">
<div style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.12em;color:rgba(201,162,39,0.6);text-transform:uppercase;margin-bottom:10px;">Recent CRM Context</div>
${previousNotes
  .map(
    (n) =>
      `<div style="padding:10px 0;border-bottom:1px solid rgba(201,162,39,0.06);">
<div style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.06em;color:rgba(250,243,217,0.4);text-transform:uppercase;margin-bottom:4px;">${escapeHtml(formatDate(n.created_at))}${n.author_name ? " — " + escapeHtml(n.author_name) : ""}</div>
<p style="font-family:Georgia,serif;font-size:13px;color:rgba(250,243,217,0.7);margin:0;line-height:1.6;">${escapeHtml(n.body).replace(/\n/g, "<br />")}</p>
</div>`,
  )
  .join("")}
</td></tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(buildSubject(lead))}</title>
</head>
<body style="margin:0;padding:0;background-color:#1a0f1a;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#1a0f1a;">
<tr><td align="center" style="padding:32px 16px;">

<table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background-color:#221623;border:1px solid rgba(201,162,39,0.15);border-radius:4px;overflow:hidden;">

<tr><td style="padding:28px 32px 20px;border-bottom:1px solid rgba(201,162,39,0.12);">
<div style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:13px;font-weight:400;letter-spacing:0.22em;color:#c9a227;text-transform:uppercase;">Pulse of Divinity</div>
<div style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:300;letter-spacing:0.15em;color:rgba(250,243,217,0.4);text-transform:uppercase;margin-top:4px;">Collector Intelligence</div>
</td></tr>

<tr><td style="padding:24px 32px 4px;">
<div style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.12em;color:rgba(201,162,39,0.6);text-transform:uppercase;margin-bottom:10px;">New Internal Note</div>
<div style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:11px;font-weight:300;color:rgba(250,243,217,0.45);margin-bottom:10px;">Added by ${escapeHtml(authorName)}</div>
<div style="background-color:rgba(26,15,26,0.5);border:1px solid rgba(201,162,39,0.10);border-radius:3px;padding:16px 18px;">
<p style="font-family:Georgia,serif;font-size:14px;color:#faf3d9;margin:0;line-height:1.7;">${noteHtml}</p>
</div>
<div style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:300;color:rgba(250,243,217,0.3);margin-top:8px;">${escapeHtml(noteTimestamp)}</div>
</td></tr>

<tr><td style="padding:20px 32px 4px;">
<div style="font-family:'Jost',Helvetica,Arial,sans-serif;font-size:10px;font-weight:400;letter-spacing:0.12em;color:rgba(201,162,39,0.6);text-transform:uppercase;margin-bottom:6px;">Collector Snapshot</div>
</td></tr>

<tr><td style="padding:4px 32px 20px;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
${snapshotRows.join("\n")}
</table>
</td></tr>

${recentContextHtml}

<tr><td align="center" style="padding:28px 32px 8px;">
<a href="${DASHBOARD_URL}" style="display:inline-block;font-family:'Jost',Helvetica,Arial,sans-serif;font-size:11px;font-weight:400;letter-spacing:0.15em;text-transform:uppercase;color:#c9a227;text-decoration:none;border:1px solid rgba(201,162,39,0.35);border-radius:3px;padding:12px 32px;">Open Collector Intelligence</a>
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

function buildTextEmail(params: EmailParams): string {
  const { lead, authorName, noteBody, noteCreatedAt, previousNotes } = params;
  const statusLabel = STATUS_LABELS[lead.status] || lead.status;
  const inquiryLabel = INQUIRY_LABELS[lead.inquiry_type] || lead.inquiry_type;
  const contactLabel = CONTACT_METHOD_LABELS[lead.contact_method] || lead.contact_method;
  const interestDisplay = getInterestDisplay(lead);
  const noteTimestamp = formatDateTime(noteCreatedAt);
  const leadReceived = formatDate(lead.created_at);

  const lines: string[] = [
    "PULSE OF DIVINITY",
    "Collector Intelligence",
    "",
    "NEW INTERNAL NOTE",
    `Added by: ${authorName}`,
    noteTimestamp,
    "",
    noteBody,
    "",
    "COLLECTOR SNAPSHOT",
    `Collector: ${lead.name}`,
  ];
  if (lead.email) lines.push(`Email: ${lead.email}`);
  if (lead.phone) lines.push(`Phone: ${lead.phone}`);
  lines.push(`Preferred Contact: ${contactLabel}`);
  lines.push(`Inquiry Type: ${inquiryLabel}`);
  if (interestDisplay) lines.push(`Interest / Artwork: ${interestDisplay}`);
  lines.push(`Current Status: ${statusLabel}`);
  if (lead.follow_up_at) {
    const overdue = isOverdue(lead.follow_up_at);
    lines.push(`Follow-Up: ${formatDate(lead.follow_up_at)}${overdue ? " [OVERDUE]" : ""}`);
  }
  lines.push(`Lead Received: ${leadReceived}`);

  if (previousNotes.length > 0) {
    lines.push("", "RECENT CRM CONTEXT");
    for (const n of previousNotes) {
      lines.push(`${formatDate(n.created_at)}${n.author_name ? " — " + n.author_name : ""}`);
      lines.push(n.body, "");
    }
  }

  lines.push("", "Open Collector Intelligence:", DASHBOARD_URL, "", "Internal notification for authorized Pulse of Divinity administrators.");
  return lines.join("\n");
}

async function sendNoteNotification(params: EmailParams): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("note-email: RESEND_API_KEY not configured", {
      noteId: params.noteId,
      leadId: params.leadId,
    });
    return;
  }

  const subject = buildSubject(params.lead);
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
        from: SENDER_BRANDED,
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

    // Fetch full safe lead context server-side — never trust frontend data
    const { data: lead } = await supabase
      .from("leads")
      .select("id, name, email, phone, contact_method, inquiry_type, interest, artwork_title, status, follow_up_at, created_at")
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

    // Fetch author display name from authenticated admin record
    const { data: admin } = await supabase
      .from("admins")
      .select("display_name")
      .eq("id", adminId)
      .single();

    const authorName = admin?.display_name ?? "Admin";

    // Fetch up to 2 previous notes for this lead (excluding the one just created)
    const { data: priorNotes } = await supabase
      .from("lead_notes")
      .select("body, created_at, author_admin_id")
      .eq("lead_id", leadId)
      .neq("id", note.id)
      .order("created_at", { ascending: false })
      .limit(2);

    // Resolve author names for previous notes
    let previousNotes: PreviousNote[] = [];
    if (priorNotes && priorNotes.length > 0) {
      const authorIds = [...new Set(priorNotes.map((n) => n.author_admin_id).filter((id): id is string => id !== null))];
      const adminMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: priorAdmins } = await supabase
          .from("admins")
          .select("id, display_name")
          .in("id", authorIds);
        if (priorAdmins) {
          for (const a of priorAdmins) {
            adminMap[a.id] = a.display_name;
          }
        }
      }
      // Reverse to chronological order for display
      previousNotes = priorNotes
        .map((n) => ({
          body: n.body,
          created_at: n.created_at,
          author_name: n.author_admin_id ? (adminMap[n.author_admin_id] ?? null) : null,
        }))
        .reverse();
    }

    const leadContext: LeadContext = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      contact_method: lead.contact_method,
      inquiry_type: lead.inquiry_type,
      interest: lead.interest,
      artwork_title: lead.artwork_title,
      status: lead.status,
      follow_up_at: lead.follow_up_at,
      created_at: lead.created_at,
    };

    // Fire-and-forget email notification — never blocks or fails the note response
    sendNoteNotification({
      lead: leadContext,
      authorName,
      noteBody: noteText,
      noteCreatedAt: note.created_at,
      noteId: note.id,
      leadId,
      previousNotes,
    }).catch((err) => {
      console.error("note-email: uncaught notification error", {
        noteId: note.id,
        leadId,
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

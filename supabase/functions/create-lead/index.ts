import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LeadPayload {
  submissionId: string;
  name: string;
  email: string;
  phone: string;
  contactMethod: string;
  inquiryType: string;
  interest: string;
  artworkId: string;
  artworkTitle: string;
  artworkCollection: string;
  artworkPrice: string;
  artworkPriceNumeric: number | null;
  message: string;
}

const VALID_INQUIRY_TYPES = new Set(["available_work", "commission", "general"]);
const VALID_CONTACT_METHODS = new Set(["email", "call", "text"]);
const MAX_FIELD_LENGTH = 2000;
const MAX_MESSAGE_LENGTH = 10000;

function validatePayload(data: Record<string, unknown>): { valid: boolean; error?: string; payload?: LeadPayload } {
  if (!data || Array.isArray(data) || typeof data !== "object") return {valid:false,error:"Invalid inquiry"};
  for (const field of ["submissionId","name","email","phone","contactMethod","inquiryType","interest","artworkId","artworkTitle","artworkCollection","artworkPrice","message"]) {
    if (data[field] !== undefined && typeof data[field] !== "string") return {valid:false,error:"Invalid field type"};
  }
  const submissionId = String(data.submissionId ?? "").trim();
  const name = String(data.name ?? "").trim();
  const email = String(data.email ?? "").trim();
  const phone = String(data.phone ?? "").trim();
  const contactMethod = String(data.contactMethod ?? "").trim();
  const inquiryType = String(data.inquiryType ?? "").trim();
  const interest = String(data.interest ?? "").trim();
  const artworkId = String(data.artworkId ?? "").trim();
  const artworkTitle = String(data.artworkTitle ?? "").trim();
  const artworkCollection = String(data.artworkCollection ?? "").trim();
  const artworkPrice = String(data.artworkPrice ?? "").trim();
  const artworkPriceNumeric = String(data.artworkPriceNumeric ?? "").trim();
  const message = String(data.message ?? "").trim();

  if (!submissionId) return { valid: false, error: "Missing submissionId" };
  if (submissionId.length > 100) return { valid: false, error: "Invalid submissionId" };
  if (!name) return { valid: false, error: "Missing name" };
  if (name.length > MAX_FIELD_LENGTH) return { valid: false, error: "Name too long" };
  if (!email) return { valid: false, error: "Missing email" };
  if (email.length > MAX_FIELD_LENGTH) return { valid: false, error: "Email too long" };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, error: "Invalid email format" };
  if (phone.length > MAX_FIELD_LENGTH) return { valid: false, error: "Phone too long" };
  if (!contactMethod) return { valid: false, error: "Missing contactMethod" };
  if (!VALID_CONTACT_METHODS.has(contactMethod)) return { valid: false, error: "Invalid contactMethod" };
  if (!inquiryType) return { valid: false, error: "Missing inquiryType" };
  if (!VALID_INQUIRY_TYPES.has(inquiryType)) return { valid: false, error: "Invalid inquiryType" };
  if (!interest) return { valid: false, error: "Missing interest" };
  if (interest.length > MAX_FIELD_LENGTH) return { valid: false, error: "Interest too long" };
  if (artworkId.length > MAX_FIELD_LENGTH) return { valid: false, error: "Artwork ID too long" };
  if (artworkTitle.length > MAX_FIELD_LENGTH) return { valid: false, error: "Artwork title too long" };
  if (artworkCollection.length > MAX_FIELD_LENGTH) return { valid: false, error: "Artwork collection too long" };
  if (artworkPrice.length > MAX_FIELD_LENGTH) return { valid: false, error: "Artwork price too long" };
  if (!message) return { valid: false, error: "Missing message" };
  if (message.length > MAX_MESSAGE_LENGTH) return { valid: false, error: "Message too long" };

  let priceNumeric: number | null = null;
  if (artworkPriceNumeric) {
    const parsed = parseFloat(artworkPriceNumeric);
    if (isNaN(parsed) || parsed < 0) return { valid: false, error: "Invalid artwork price numeric" };
    priceNumeric = parsed;
  }

  return {
    valid: true,
    payload: {
      submissionId,
      name,
      email,
      phone,
      contactMethod,
      inquiryType,
      interest,
      artworkId,
      artworkTitle,
      artworkCollection,
      artworkPrice,
      artworkPriceNumeric: priceNumeric,
      message,
    },
  };
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
    const raw = await req.text();
    if (raw.length > 24000) return new Response(JSON.stringify({error:"Inquiry too large"}), {status:413,headers:{...corsHeaders,"Content-Type":"application/json"}});
    const body = JSON.parse(raw);
    const result = validatePayload(body);
    if (!result.valid) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = result.payload!;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(address));
    const rateKey = Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2,"0")).join("");
    const { data, error } = await supabase.rpc("pod_create_inquiry", { p_payload: {...p, handoff:body.handoff===true, _rateKey:rateKey} });
    if (error) {
      const status = error.code === "P0003" ? 429 : error.code === "23505" ? 409 : error.code === "P0001" ? 400 : 500;
      return new Response(JSON.stringify({ error: status === 500 ? "Unable to save inquiry" : "Please check your inquiry or retry later" }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!data?.id || data.success !== true) throw new Error("Missing committed inquiry ID");
    return new Response(JSON.stringify(data), {
      status: data.duplicate ? 200 : 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Unable to save inquiry" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

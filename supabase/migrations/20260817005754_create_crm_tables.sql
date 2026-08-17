/*
# Create Collector CRM Backend Foundation

## Purpose
This migration creates the secure backend database foundation for the Pulse of Divinity Collector CRM.
It establishes three tables (admins, leads, lead_notes) with Row Level Security policies that
ensure only approved active administrators can read or modify CRM data, while public visitors
can only create new leads through the approved server-side ingestion path (edge function).

## Tables Created

### 1. admins
- Stores the three approved administrator identities (Darcy, Josh, Heber)
- `id` (UUID, PK) — stable unique identifier for this admin record
- `auth_user_id` (UUID, UNIQUE, FK to auth.users) — links to the Bolt Authentication user identity
- `display_name` (TEXT, NOT NULL) — human-readable name
- `email` (TEXT, NOT NULL, UNIQUE) — admin's email address
- `role` (TEXT, NOT NULL, DEFAULT 'admin') — extensible for future roles
- `active` (BOOLEAN, NOT NULL, DEFAULT true) — revocation toggle
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())

### 2. leads
- Stores collector inquiries (one row per real form submission)
- `id` (UUID, PK) — unique lead identifier
- `submission_id` (TEXT, NOT NULL, UNIQUE) — idempotency key to prevent duplicate CRM records
- `name` (TEXT, NOT NULL) — collector's name
- `email` (TEXT, NOT NULL) — collector's email
- `phone` (TEXT, nullable) — collector's phone
- `contact_method` (TEXT, NOT NULL) — preferred contact method
- `inquiry_type` (TEXT, NOT NULL) — 'available_work', 'commission', or 'general'
- `interest` (TEXT, NOT NULL) — the selected option from the dropdown
- `artwork_id` (TEXT, nullable) — snapshot of artwork ID at inquiry time
- `artwork_title` (TEXT, nullable) — snapshot of artwork title at inquiry time
- `artwork_collection` (TEXT, nullable) — snapshot of artwork collection at inquiry time
- `artwork_price_display` (TEXT, nullable) — snapshot of artwork price display string
- `artwork_price_numeric` (NUMERIC, nullable) — snapshot of artwork numeric price
- `message` (TEXT, NOT NULL) — collector's message
- `status` (TEXT, NOT NULL, DEFAULT 'NEW') — CRM lifecycle status
- `assigned_admin_id` (UUID, nullable, FK to admins.id) — admin responsible for this lead
- `follow_up_at` (DATE, nullable) — scheduled follow-up date
- `outcome` (TEXT, nullable) — result of the lead (no enum constraint in V1)
- `archived` (BOOLEAN, NOT NULL, DEFAULT false) — archive toggle (orthogonal to status)
- `archived_at` (TIMESTAMPTZ, nullable) — when the lead was archived
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())

### 3. lead_notes
- Stores internal admin notes on leads (one-to-many: one lead has many notes)
- `id` (UUID, PK) — unique note identifier
- `lead_id` (UUID, NOT NULL, FK to leads.id ON DELETE RESTRICT) — prevents deleting leads with notes
- `author_admin_id` (UUID, NOT NULL, FK to admins.id ON DELETE RESTRICT) — prevents deleting admins with notes
- `body` (TEXT, NOT NULL) — note content
- `created_at` (TIMESTAMPTZ, DEFAULT now())

## Constraints
- admins.auth_user_id UNIQUE
- admins.email UNIQUE
- leads.submission_id UNIQUE (idempotency)
- leads.assigned_admin_id FK to admins.id (ON DELETE SET NULL — don't lose leads if admin record removed)
- lead_notes.lead_id FK to leads.id (ON DELETE RESTRICT — no accidental lead deletion)
- lead_notes.author_admin_id FK to admins.id (ON DELETE RESTRICT — preserve authorship)

## Indexes
- leads(status) — filter by CRM status
- leads(archived) — filter active vs archived
- leads(created_at DESC) — sort by most recent
- leads(follow_up_at) — find due follow-ups
- leads(assigned_admin_id) — find leads per admin
- leads(submission_id) — idempotency lookup (UNIQUE constraint already indexes this)

## Security (RLS)
All three tables have RLS enabled. NO policies are created for anon or authenticated roles.
This means:
- Public/anon users CANNOT read, insert, update, or delete any CRM data directly
- Authenticated but unapproved users CANNOT read, insert, update, or delete any CRM data directly
- Only the edge function (using the service role key, which bypasses RLS) can write leads
- Only admin-authenticated edge functions (which verify admin status server-side) can read/update leads

The authorization check is performed server-side in the edge function by querying the admins table.
RLS ensures the database itself is locked down — even if the anon key is compromised, no CRM data leaks.

## Important Notes
1. Admin records are NOT created in this migration. They will be inserted after auth users are created.
2. The edge function uses the service role key to bypass RLS for lead creation (public ingestion path).
3. Admin-only operations (read/update leads, manage notes) will be handled by separate edge functions
   that verify the user's JWT and check admin status before proceeding.
4. No hard delete is available in V1. Archiving is the only way to remove leads from the active view.
5. Artwork information is snapshotted at inquiry time — historical leads retain original prices/titles.
*/

-- ============================================================
-- TABLE: admins
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: leads
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id text NOT NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  contact_method text NOT NULL,
  inquiry_type text NOT NULL,
  interest text NOT NULL,
  artwork_id text,
  artwork_title text,
  artwork_collection text,
  artwork_price_display text,
  artwork_price_numeric numeric,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'NEW',
  assigned_admin_id uuid REFERENCES admins(id) ON DELETE SET NULL,
  follow_up_at date,
  outcome text,
  archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: lead_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  author_admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads(archived);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_at ON leads(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_admin_id ON leads(assigned_admin_id);
-- submission_id is already indexed by the UNIQUE constraint

-- ============================================================
-- UPDATED_AT trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_admins_updated_at ON admins;
CREATE TRIGGER trigger_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON leads;
CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

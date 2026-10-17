-- ==============================================================================
-- POLESTAR CS LIVE INQUIRY PORTAL - SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Then run supabase_migration_2026_10_team.sql (managers, profiles, weekly targets).
-- ==============================================================================

-- 1. Create Inquiries Table
CREATE TABLE IF NOT EXISTS public.inquiries (
    id TEXT NOT NULL,
    owner_id UUID NOT NULL DEFAULT auth.uid(), -- the CS rep who owns this inquiry
    received_at TIMESTAMPTZ DEFAULT NOW(),
    shipper_name TEXT NOT NULL,
    gstin TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    pol TEXT NOT NULL,
    pod TEXT NOT NULL,
    pol_code TEXT,
    pod_code TEXT,
    container_type TEXT DEFAULT '40'' HC',
    routing_mode TEXT DEFAULT 'Ocean FCL',
    commodity TEXT,
    gross_weight_kg NUMERIC(12, 2) DEFAULT 0,
    volume_cbm NUMERIC(10, 2) DEFAULT 0,
    incoterms TEXT DEFAULT 'FOB',
    free_days_at_pod TEXT DEFAULT '14 Days',
    preferred_carrier TEXT,
    is_quoted BOOLEAN DEFAULT FALSE,
    has_replied BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'INQUIRY_RECEIVED',
    quoted_rate TEXT,
    quoted_currency TEXT DEFAULT 'USD',
    quoted_amount_total NUMERIC(12, 2) DEFAULT 0,
    quote_validity DATE,
    assigned_to TEXT,
    conversation_gist TEXT,
    screenshot_url TEXT,
    email_subject TEXT,
    replied_at TIMESTAMPTZ,
    response_tat_minutes INTEGER,
    confirmed_at TIMESTAMPTZ,
    nomination JSONB,
    awaiting_since TIMESTAMPTZ,
    lost_reason TEXT,
    lost_note TEXT,
    follow_ups JSONB DEFAULT '[]'::jsonb,
    audit_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (owner_id, id)
);

-- 1b. Migration for existing databases (reply workflow + nomination sheet columns)
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS email_subject TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS response_tat_minutes INTEGER;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS nomination JSONB;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS awaiting_since TIMESTAMPTZ;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS lost_note TEXT;
CREATE INDEX IF NOT EXISTS idx_inquiries_confirmed_at ON public.inquiries(confirmed_at DESC);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_received_at ON public.inquiries(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_shipper ON public.inquiries(shipper_name);

-- 3. Row Level Security: each CS rep can only see or change their own inquiries.
-- (Existing databases: run supabase_migration_2026_10.sql, then supabase_migration_2026_10_private.sql.)
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps read their own inquiries"
ON public.inquiries FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Reps add their own inquiries"
ON public.inquiries FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Reps update their own inquiries"
ON public.inquiries FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Reps delete their own inquiries"
ON public.inquiries FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- 4. Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_update_inquiries_timestamp ON public.inquiries;
CREATE TRIGGER tr_update_inquiries_timestamp
    BEFORE UPDATE ON public.inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

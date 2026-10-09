-- ==============================================================================
-- POLESTAR CS LIVE INQUIRY PORTAL - SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ==============================================================================

-- 1. Create Inquiries Table
CREATE TABLE IF NOT EXISTS public.inquiries (
    id TEXT PRIMARY KEY,
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
    audit_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_received_at ON public.inquiries(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_shipper ON public.inquiries(shipper_name);

-- 3. Enable Row Level Security (RLS) & Public Access Policy for Live CS Team
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon/authenticated roles (for internal CS operations)
CREATE POLICY "Allow anonymous read access to inquiries" 
ON public.inquiries FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow anonymous insert access to inquiries" 
ON public.inquiries FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to inquiries" 
ON public.inquiries FOR UPDATE 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow anonymous delete access to inquiries" 
ON public.inquiries FOR DELETE 
TO anon, authenticated 
USING (true);

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

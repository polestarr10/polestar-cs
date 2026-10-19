-- ==============================================================================
-- POLESTAR CS HUB - IMPORT / CARGO DETAILS (October 2026)
-- Adds the details import inquiries carry (import/export, packages, HSN code,
-- dimensions, pickup address), and saves fields the app already reads from
-- emails but never stored (cargo ready date, special requirements, urgency,
-- the start of the original email).
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Run it BEFORE deploying the app version that uses these columns.
-- Nothing to fill in. Safe to run more than once.
-- ==============================================================================

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS direction TEXT;            -- 'Import' / 'Export'
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS packages TEXT;             -- e.g. '100 boxes'
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS dimensions TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS cargo_ready_date TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS special_requirements TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'NORMAL';
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS raw_email_snippet TEXT;

-- CHECK: should list the 9 columns above.
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'inquiries'
  AND column_name IN ('direction','packages','hsn_code','dimensions','pickup_address','cargo_ready_date','special_requirements','urgency','raw_email_snippet');

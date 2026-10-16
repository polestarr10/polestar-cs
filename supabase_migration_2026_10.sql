-- ==============================================================================
-- POLESTAR CS HUB - DATABASE UPDATE (October 2026)
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Safe to run more than once.
--
-- ORDER MATTERS:
--   1. Deploy the new app version first (it has the sign-in screen).
--   2. Create the reps' accounts (Authentication > Users > Add user).
--   3. Then run this script. After Part B, only signed-in reps can read or
--      change inquiries, so an older app version without login stops working.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- PART A: new columns (reply workflow, nomination sheet, follow-ups, lost reasons)
-- ------------------------------------------------------------------------------
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS email_subject TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS response_tat_minutes INTEGER;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS nomination JSONB;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS awaiting_since TIMESTAMPTZ;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS lost_note TEXT;

CREATE INDEX IF NOT EXISTS idx_inquiries_confirmed_at ON public.inquiries(confirmed_at DESC);


-- ------------------------------------------------------------------------------
-- PART B: lock the table to signed-in reps (replaces the old "anyone" policies)
-- ------------------------------------------------------------------------------
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read access to inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Allow anonymous insert access to inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Allow anonymous update access to inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Allow anonymous delete access to inquiries" ON public.inquiries;

DROP POLICY IF EXISTS "Signed-in reps can read inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Signed-in reps can add inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Signed-in reps can update inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Signed-in reps can delete inquiries" ON public.inquiries;

CREATE POLICY "Signed-in reps can read inquiries"
ON public.inquiries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Signed-in reps can add inquiries"
ON public.inquiries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Signed-in reps can update inquiries"
ON public.inquiries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Signed-in reps can delete inquiries"
ON public.inquiries FOR DELETE TO authenticated USING (true);


-- ------------------------------------------------------------------------------
-- CHECK: should list the 8 new columns and the 4 "Signed-in reps" policies.
-- ------------------------------------------------------------------------------
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'inquiries'
  AND column_name IN ('email_subject','replied_at','response_tat_minutes','confirmed_at','nomination','awaiting_since','lost_reason','lost_note');

SELECT policyname, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inquiries';

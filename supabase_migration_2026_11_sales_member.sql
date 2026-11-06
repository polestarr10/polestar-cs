-- ==============================================================================
-- POLESTAR CS HUB - SALES MEMBER ON EACH INQUIRY (November 2026)
-- Records which sales member brought each inquiry in, for per-salesperson reports.
-- (The list of sales members itself is saved on each CS's login; no table needed.)
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Run it BEFORE using/deploying the app version with the "Sales member" field.
-- Nothing to fill in. Safe to run more than once.
-- ==============================================================================

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS sales_member TEXT;     -- name, as shown in reports
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS sales_member_id TEXT;  -- stable id from the CS's team list

-- CHECK: should show two rows, sales_member and sales_member_id.
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'inquiries' AND column_name IN ('sales_member', 'sales_member_id');

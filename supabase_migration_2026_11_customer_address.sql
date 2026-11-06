-- ==============================================================================
-- POLESTAR CS HUB - CUSTOMER ADDRESS (November 2026)
-- Stores the client's office address (read from their email signature).
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Run it BEFORE deploying the app version that has the "Customer address" field.
-- Nothing to fill in. Safe to run more than once.
-- ==============================================================================

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- CHECK: should show one row, customer_address.
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'inquiries' AND column_name = 'customer_address';

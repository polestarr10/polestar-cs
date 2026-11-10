-- ==============================================================================
-- POLESTAR CS HUB - INTERNAL BUY / SELL CHARGE NOTE (November 2026)
-- For ex-works inquiries: what the charge costs Polestar (buy) and what the
-- customer is charged (sell). Internal only, never put in the quotation.
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Run it BEFORE using/deploying the app version with the buy/sell note.
-- Nothing to fill in. Safe to run more than once.
-- ==============================================================================

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS buy_charge TEXT;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS sell_charge TEXT;

-- CHECK: should show two rows, buy_charge and sell_charge.
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'inquiries' AND column_name IN ('buy_charge', 'sell_charge');

-- ==============================================================================
-- POLESTAR CS HUB - AGENT RATE REQUESTS (November 2026)
-- For ex-works inquiries: a log of the agents asked for pickup / origin rates
-- (who, which email, when). The list of agents itself is saved on each CS's
-- login; no table needed.
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Run it BEFORE using/deploying the app version with "Ask agent for rates".
-- Nothing to fill in. Safe to run more than once.
-- ==============================================================================

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS agent_requests JSONB DEFAULT '[]'::jsonb;

-- CHECK: should show one row, agent_requests.
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'inquiries' AND column_name = 'agent_requests';

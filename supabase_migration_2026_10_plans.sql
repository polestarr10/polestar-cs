-- ==============================================================================
-- POLESTAR CS HUB - WEEKLY PLANS (October 2026)
-- Stores each rep's weekly plan (written by the rep, checked with the VP) and their
-- progress on it. Reps see only their own; managers can read everyone's.
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Run it AFTER supabase_migration_2026_10_team.sql. Nothing to fill in.
-- Safe to run more than once.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.weekly_plans (
    owner_id UUID NOT NULL DEFAULT auth.uid(),
    week_start DATE NOT NULL,   -- Monday of the week
    plan JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (owner_id, week_start)
);
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reps read own plans, managers read all" ON public.weekly_plans;
DROP POLICY IF EXISTS "Reps add their own plans" ON public.weekly_plans;
DROP POLICY IF EXISTS "Reps update their own plans" ON public.weekly_plans;
DROP POLICY IF EXISTS "Reps delete their own plans" ON public.weekly_plans;

CREATE POLICY "Reps read own plans, managers read all"
ON public.weekly_plans FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_manager());

CREATE POLICY "Reps add their own plans"
ON public.weekly_plans FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Reps update their own plans"
ON public.weekly_plans FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Reps delete their own plans"
ON public.weekly_plans FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- CHECK: should list the 4 policies above.
SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weekly_plans';

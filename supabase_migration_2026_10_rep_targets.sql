-- ==============================================================================
-- POLESTAR CS HUB - REPS SET THEIR OWN WEEKLY TARGETS (October 2026)
-- For now each CS rep agrees their weekly CBM target with the VP in person and
-- enters it themselves. This lets a rep add and change their OWN target rows
-- (managers, if any are listed later, can still set anyone's).
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Run it AFTER supabase_migration_2026_10_team.sql. Nothing to fill in.
-- Safe to run more than once.
-- ==============================================================================

DROP POLICY IF EXISTS "Reps add their own targets" ON public.rep_targets;
DROP POLICY IF EXISTS "Reps change their own targets" ON public.rep_targets;

CREATE POLICY "Reps add their own targets"
ON public.rep_targets FOR INSERT TO authenticated WITH CHECK (rep_id = auth.uid());

CREATE POLICY "Reps change their own targets"
ON public.rep_targets FOR UPDATE TO authenticated USING (rep_id = auth.uid()) WITH CHECK (rep_id = auth.uid());

-- CHECK: should include "Reps add their own targets" and "Reps change their own targets".
SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rep_targets';

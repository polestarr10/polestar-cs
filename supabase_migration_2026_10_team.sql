-- ==============================================================================
-- POLESTAR CS HUB - FOLLOW-UPS, WEEKLY CBM TARGETS, MANAGER VIEW (October 2026)
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Run it AFTER supabase_migration_2026_10_private.sql, and BEFORE deploying the
-- app version with "My Day" (that version saves follow-ups to a new column).
-- Safe to run more than once.
--
-- BEFORE RUNNING: put the manager login emails in PART E below.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- PART A: follow-ups sent to quiet customers
-- ------------------------------------------------------------------------------
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS follow_ups JSONB DEFAULT '[]'::jsonb;


-- ------------------------------------------------------------------------------
-- PART B: managers (login emails that can see the whole team's numbers)
-- Change this list only here in the SQL editor; the app can't edit it.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.managers (
    email TEXT PRIMARY KEY
);
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can see their own row" ON public.managers;
CREATE POLICY "Managers can see their own row"
ON public.managers FOR SELECT TO authenticated
USING (lower(email) = lower(auth.jwt() ->> 'email'));

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.managers WHERE lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- Managers can READ every rep's inquiries. Changing them stays owner-only.
DROP POLICY IF EXISTS "Managers read all inquiries" ON public.inquiries;
CREATE POLICY "Managers read all inquiries"
ON public.inquiries FOR SELECT TO authenticated USING (public.is_manager());


-- ------------------------------------------------------------------------------
-- PART C: rep profiles (name and role, so the team report shows names)
-- The app fills this in when a rep signs in.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reps read own profile, managers read all" ON public.profiles;
DROP POLICY IF EXISTS "Reps add their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Reps update their own profile" ON public.profiles;

CREATE POLICY "Reps read own profile, managers read all"
ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_manager());

CREATE POLICY "Reps add their own profile"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "Reps update their own profile"
ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());


-- ------------------------------------------------------------------------------
-- PART D: weekly CBM targets (set by managers; a target applies from its week
-- onward until a later one replaces it)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rep_targets (
    rep_id UUID NOT NULL,
    week_start DATE NOT NULL,   -- Monday of the week
    target_cbm NUMERIC(10, 2) NOT NULL CHECK (target_cbm > 0),
    set_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (rep_id, week_start)
);
ALTER TABLE public.rep_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reps read own targets, managers read all" ON public.rep_targets;
DROP POLICY IF EXISTS "Managers add targets" ON public.rep_targets;
DROP POLICY IF EXISTS "Managers change targets" ON public.rep_targets;
DROP POLICY IF EXISTS "Managers delete targets" ON public.rep_targets;

CREATE POLICY "Reps read own targets, managers read all"
ON public.rep_targets FOR SELECT TO authenticated USING (rep_id = auth.uid() OR public.is_manager());

CREATE POLICY "Managers add targets"
ON public.rep_targets FOR INSERT TO authenticated WITH CHECK (public.is_manager());

CREATE POLICY "Managers change targets"
ON public.rep_targets FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());

CREATE POLICY "Managers delete targets"
ON public.rep_targets FOR DELETE TO authenticated USING (public.is_manager());


-- ------------------------------------------------------------------------------
-- PART E: who the managers are. Replace with real login emails (add a line per
-- manager). To remove one later: DELETE FROM public.managers WHERE email = '...';
-- ------------------------------------------------------------------------------
INSERT INTO public.managers (email) VALUES
    ('REPLACE_WITH_MANAGER_EMAIL')
ON CONFLICT (email) DO NOTHING;

DELETE FROM public.managers WHERE email = 'REPLACE_WITH_MANAGER_EMAIL';


-- ------------------------------------------------------------------------------
-- CHECK: the managers list, and the policies on each table.
-- ------------------------------------------------------------------------------
SELECT email AS manager FROM public.managers;

SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('inquiries', 'managers', 'profiles', 'rep_targets')
ORDER BY tablename, policyname;

-- ==============================================================================
-- POLESTAR CS HUB - PRIVATE DATA PER REP (October 2026)
-- Each CS rep sees and changes only their own inquiries, replies and nominations.
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Run it AFTER supabase_migration_2026_10.sql. Safe to run more than once.
--
-- If there is only one account, just run it: existing inquiries go to that account.
-- With several accounts, first put the owner's login email in owner_email (PART B).
-- Every inquiry already in the database becomes yours; other reps start empty.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- PART A: every inquiry records which rep owns it (filled in automatically)
-- ------------------------------------------------------------------------------
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS owner_id UUID DEFAULT auth.uid();
ALTER TABLE public.inquiries ALTER COLUMN owner_id SET DEFAULT auth.uid();


-- ------------------------------------------------------------------------------
-- PART B: give the inquiries that already exist to one rep
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  owner_email TEXT := 'REPLACE_WITH_YOUR_LOGIN_EMAIL';
  owner UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.inquiries WHERE owner_id IS NULL) THEN
    IF owner_email = 'REPLACE_WITH_YOUR_LOGIN_EMAIL' THEN
      -- No email filled in: fine if there is exactly one account, it gets them.
      IF (SELECT count(*) FROM auth.users) <> 1 THEN
        RAISE EXCEPTION 'There are % accounts, so put the login email that should own the existing inquiries in owner_email (Part B) and run again.', (SELECT count(*) FROM auth.users);
      END IF;
      SELECT id INTO owner FROM auth.users;
    ELSE
      SELECT id INTO owner FROM auth.users WHERE lower(email) = lower(owner_email);
    END IF;
    IF owner IS NULL THEN
      RAISE EXCEPTION 'No account with email "%". Put your login email in owner_email (Part B) and run again.', owner_email;
    END IF;
    UPDATE public.inquiries SET owner_id = owner WHERE owner_id IS NULL;
  END IF;
END $$;

ALTER TABLE public.inquiries ALTER COLUMN owner_id SET NOT NULL;

-- Inquiry numbers only need to be unique per rep, since reps can't see each other's.
ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_pkey;
ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_pkey PRIMARY KEY (owner_id, id);


-- ------------------------------------------------------------------------------
-- PART C: row security - a rep can only read, add, change or delete their own rows
-- ------------------------------------------------------------------------------
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in reps can read inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Signed-in reps can add inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Signed-in reps can update inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Signed-in reps can delete inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Reps read their own inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Reps add their own inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Reps update their own inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Reps delete their own inquiries" ON public.inquiries;

CREATE POLICY "Reps read their own inquiries"
ON public.inquiries FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Reps add their own inquiries"
ON public.inquiries FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Reps update their own inquiries"
ON public.inquiries FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Reps delete their own inquiries"
ON public.inquiries FOR DELETE TO authenticated USING (owner_id = auth.uid());


-- ------------------------------------------------------------------------------
-- CHECK: should show the 4 "Reps ... their own inquiries" policies, and one row
-- per rep with how many inquiries they own.
-- ------------------------------------------------------------------------------
SELECT policyname, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inquiries';

SELECT u.email, count(*) AS inquiries
FROM public.inquiries i JOIN auth.users u ON u.id = i.owner_id
GROUP BY u.email;

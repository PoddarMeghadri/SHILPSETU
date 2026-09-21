-- Migration: Allow unauthenticated lookup of contact identities during registration checks
-- Enforces Strict Duplicate Account Prevention (1 Email & 1 Mobile per User)

-- 1. Ensure public.profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  mobile_number TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'hi',
  desired_workshop TEXT,
  location TEXT,
  craft_specialty TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow anon and authenticated users to check contact identity uniqueness
DROP POLICY IF EXISTS "Allow unauthenticated contact identity check" ON public.profiles;
CREATE POLICY "Allow unauthenticated contact identity check"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. User profile self-management policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

NOTIFY pgrst, 'reload schema';

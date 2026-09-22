-- ShilpSetu: Storage policies, Location/City persistence, and Unique Account Constraints
-- Copy and paste into the Supabase SQL Editor if running manually

-- 1. Ensure columns exist on profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  mobile_number TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'hi',
  desired_workshop TEXT,
  city TEXT,
  location TEXT,
  craft_specialty TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS desired_workshop text;

-- 2. Enforce strict uniqueness for single email and mobile
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS unique_user_email;
ALTER TABLE public.profiles ADD CONSTRAINT unique_user_email UNIQUE (email);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS unique_user_mobile;
ALTER TABLE public.profiles ADD CONSTRAINT unique_user_mobile UNIQUE (mobile_number);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Profile Read" ON public.profiles;
CREATE POLICY "Public Profile Read" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated User Profile Upsert" ON public.profiles;
CREATE POLICY "Authenticated User Profile Upsert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Authenticated User Profile Update" ON public.profiles;
CREATE POLICY "Authenticated User Profile Update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Ensure avatars bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Storage RLS policies for external uploads
DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
CREATE POLICY "Public Avatar Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated User Avatar Upload" ON storage.objects;
CREATE POLICY "Authenticated User Avatar Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated User Avatar Update" ON storage.objects;
CREATE POLICY "Authenticated User Avatar Update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload schema';

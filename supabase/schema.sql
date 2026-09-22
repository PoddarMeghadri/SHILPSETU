-- ShilpSetu Profiles & Tables Schema for Supabase
-- Copy and paste this into the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  mobile_number TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'hi',
  desired_workshop TEXT,
  state TEXT,
  city TEXT,
  location TEXT,
  craft_specialty TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS desired_workshop text;

-- Enforce strict uniqueness for single email and mobile
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS unique_user_email;
ALTER TABLE public.profiles ADD CONSTRAINT unique_user_email UNIQUE (email);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS unique_user_mobile;
ALTER TABLE public.profiles ADD CONSTRAINT unique_user_mobile UNIQUE (mobile_number);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (id = auth.uid());

-- Allow unauthenticated lookup of contact identities during registration checks
DROP POLICY IF EXISTS "Allow unauthenticated contact identity check" ON public.profiles;
CREATE POLICY "Allow unauthenticated contact identity check" 
  ON public.profiles FOR SELECT 
  TO anon, authenticated 
  USING (true);

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

-- 4. Automatically create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Storage Buckets and Policies for Avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
CREATE POLICY "Public Avatar Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated User Avatar Upload" ON storage.objects;
CREATE POLICY "Authenticated User Avatar Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated User Avatar Update" ON storage.objects;
CREATE POLICY "Authenticated User Avatar Update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Notify schema cache reload
NOTIFY pgrst, 'reload schema';

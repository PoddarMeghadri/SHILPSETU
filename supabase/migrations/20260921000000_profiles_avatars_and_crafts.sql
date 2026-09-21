-- ShilpSetu Profiles, Avatars & Crafts Schema Migration
-- Execute in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)

-- 1. Ensure profile columns exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  mobile_number text,
  preferred_language text DEFAULT 'en',
  desired_workshop text,
  location text,
  craft_specialty text,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS desired_workshop text;

-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Allow public read of profiles'
  ) THEN
    CREATE POLICY "Allow public read of profiles" ON public.profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Allow users to insert their own profile'
  ) THEN
    CREATE POLICY "Allow users to insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Allow users to update their own profile'
  ) THEN
    CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- 2. Create crafts table linked to user
CREATE TABLE IF NOT EXISTS public.crafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  story text,
  price numeric DEFAULT 0,
  materials text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crafts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crafts' AND policyname = 'Allow public read of crafts'
  ) THEN
    CREATE POLICY "Allow public read of crafts"
      ON public.crafts FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crafts' AND policyname = 'Allow users to insert their own crafts'
  ) THEN
    CREATE POLICY "Allow users to insert their own crafts"
      ON public.crafts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crafts' AND policyname = 'Allow users to update their own crafts'
  ) THEN
    CREATE POLICY "Allow users to update their own crafts"
      ON public.crafts FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Storage Buckets (avatars and crafts)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true), ('crafts', 'crafts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access avatars'
  ) THEN
    CREATE POLICY "Public Access avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload avatars'
  ) THEN
    CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update avatars'
  ) THEN
    CREATE POLICY "Authenticated users can update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access crafts'
  ) THEN
    CREATE POLICY "Public Access crafts" ON storage.objects FOR SELECT USING (bucket_id = 'crafts');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload crafts'
  ) THEN
    CREATE POLICY "Authenticated users can upload crafts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'crafts');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update crafts'
  ) THEN
    CREATE POLICY "Authenticated users can update crafts" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'crafts');
  END IF;
END $$;

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';

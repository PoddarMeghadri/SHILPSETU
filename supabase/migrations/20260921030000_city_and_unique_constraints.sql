-- Migration: Add city column and enforce strict unique constraints on public.profiles
-- Enforces:
-- 1. City / location persistence
-- 2. Strict Duplicate Account Guard (1 Email & 1 Mobile per Account)

-- 1. Add city column if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;

-- 2. Add unique constraints for email and mobile_number
DO $$ 
BEGIN
  -- Add unique constraint on email if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_email'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT unique_user_email UNIQUE (email);
  END IF;

  -- Add unique constraint on mobile_number if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_mobile'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT unique_user_mobile UNIQUE (mobile_number);
  END IF;
END $$;

-- 3. Notify schema cache reload
NOTIFY pgrst, 'reload schema';

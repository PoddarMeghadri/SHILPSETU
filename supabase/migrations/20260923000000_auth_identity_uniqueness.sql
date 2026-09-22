-- Make duplicate-account checks cover Auth users created before profiles existed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS city text;

INSERT INTO public.profiles (id, email, full_name)
SELECT
  u.id,
  lower(trim(u.email)),
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
FROM auth.users AS u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET email = coalesce(public.profiles.email, excluded.email);

CREATE OR REPLACE FUNCTION public.check_identity_uniqueness(
  p_email text DEFAULT NULL,
  p_mobile text DEFAULT NULL
)
RETURNS TABLE(email_exists boolean, mobile_exists boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE lower(trim(email)) = lower(trim(p_email))
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE lower(trim(email)) = lower(trim(p_email))
    ),
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE regexp_replace(mobile_number, '\D', '', 'g') =
            regexp_replace(coalesce(p_mobile, ''), '\D', '', 'g')
    );
$$;

REVOKE ALL ON FUNCTION public.check_identity_uniqueness(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_identity_uniqueness(text, text) TO anon, authenticated;

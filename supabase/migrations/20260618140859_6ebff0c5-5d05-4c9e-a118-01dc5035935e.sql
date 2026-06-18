CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.verify_family_password(p_email text, p_password text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = lower(p_email)
      AND encrypted_password = extensions.crypt(p_password, encrypted_password)
  );
$$;

REVOKE ALL ON FUNCTION public.verify_family_password(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_family_password(text, text) TO service_role;
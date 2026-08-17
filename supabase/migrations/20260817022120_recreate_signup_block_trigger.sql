/*
# Recreate Public Signup Block Trigger

The original trigger was dropped to fix the auth system. Now that users are
created properly via the admin API, we recreate the trigger to block
unauthorized signups.

This trigger blocks any INSERT into auth.users where the email is not
already in the admins table.
*/

CREATE OR REPLACE FUNCTION public.block_unauthorized_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'Public registration is not available for this application.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if re-running
DROP TRIGGER IF EXISTS trigger_block_unauthorized_signup ON auth.users;

CREATE TRIGGER trigger_block_unauthorized_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.block_unauthorized_signup();

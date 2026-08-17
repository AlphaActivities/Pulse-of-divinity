/*
# Block Public Self-Registration

## Purpose
This migration creates a database-level safety net that prevents public self-registration
of new auth users. Even if the platform-level signup toggle is accidentally left enabled,
this trigger will reject any new user signup whose email is not in the approved admin list.

The three approved admin emails are:
- darcy.pulseofdivinity@gmail.com (Darcy)
- yourcustomerflowguy@gmail.com (Josh)
- heberherrera92@gmail.com (Heber)

Since these accounts already exist, the UNIQUE constraint on auth.users.email will also
prevent duplicates. This trigger provides defense-in-depth.

## Security
- The trigger function runs with SECURITY DEFINER (as the table owner) so it can evaluate
  regardless of the calling role.
- It checks the new user's email against an approved list stored in the public.admins table.
- If the email is not in the admins table, the INSERT is rejected with an error.
- Service-role inserts (like the ones used to create the initial admin accounts) are allowed
  because those emails ARE in the admins table.
- Future admin additions require first inserting into the admins table, then creating the
  auth user — the trigger will allow it because the email already exists in admins.

## Important Notes
1. This does NOT replace the platform-level signup toggle. The administrator should still
   disable public signup in the Bolt dashboard for defense-in-depth.
2. To add a new admin in the future: first INSERT into admins (with the email), then create
   the auth user. The trigger will allow it.
3. This trigger does NOT affect existing users — it only fires on INSERT.
*/

CREATE OR REPLACE FUNCTION public.block_unauthorized_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow only emails that exist in the admins table
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE email = NEW.email) THEN
    RAISE EXCEPTION 'Public registration is not available for this application.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if re-running
DROP TRIGGER IF EXISTS trigger_block_unauthorized_signup ON auth.users;

-- Create the trigger BEFORE INSERT on auth.users
CREATE TRIGGER trigger_block_unauthorized_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.block_unauthorized_signup();

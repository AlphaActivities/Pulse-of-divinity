/*
# Revoke PUBLIC Execute on Commerce Functions

## Purpose
The initial commerce migration revoked EXECUTE from anon and authenticated roles on the
four SECURITY DEFINER commerce functions. However, PostgreSQL grants EXECUTE to PUBLIC
by default when a function is created. The REVOKE FROM anon, authenticated removed
explicit grants from those roles, but the implicit PUBLIC grant still allows them to
execute the functions.

This migration adds REVOKE EXECUTE ... FROM PUBLIC for all four commerce functions,
closing the gap. The service role (used by edge functions) retains access because it
operates with elevated privileges that bypass standard grant checks.

## Functions affected
- reserve_artwork(text, text, integer)
- release_expired_reservations()
- release_reservation(text)
- mark_artwork_sold(text)

## Security impact
After this migration, only the service role can invoke these functions. Anon and
authenticated roles (including any logged-in non-admin user) cannot execute them.
*/

REVOKE EXECUTE ON FUNCTION public.reserve_artwork(text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_expired_reservations() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_reservation(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_artwork_sold(text) FROM PUBLIC;

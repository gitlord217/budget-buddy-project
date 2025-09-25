-- 1) Create secure helper to get current user's email without exposing auth.users
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Allow app roles to execute the function
GRANT EXECUTE ON FUNCTION public.current_user_email() TO anon, authenticated;

-- 2) Update RLS policies to use the helper instead of querying auth.users directly
DROP POLICY IF EXISTS "Users can view their invitations" ON public.group_invitations;
CREATE POLICY "Users can view their invitations"
ON public.group_invitations
FOR SELECT
USING (
  (invited_user_id = auth.uid()) OR
  (invited_by = auth.uid()) OR
  (invited_email = public.current_user_email())
);

DROP POLICY IF EXISTS "Users can update invitations sent to them or by them" ON public.group_invitations;
CREATE POLICY "Users can update invitations sent to them or by them"
ON public.group_invitations
FOR UPDATE
USING (
  (invited_user_id = auth.uid()) OR 
  (invited_by = auth.uid()) OR 
  (invited_email = public.current_user_email())
);

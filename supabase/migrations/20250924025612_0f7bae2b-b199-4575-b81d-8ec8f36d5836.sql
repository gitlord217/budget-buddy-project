-- Fix the SELECT policy for group_invitations to include email check
DROP POLICY IF EXISTS "Users can view their invitations" ON public.group_invitations;

CREATE POLICY "Users can view their invitations" 
ON public.group_invitations 
FOR SELECT 
USING (
  (invited_user_id = auth.uid()) OR 
  (invited_by = auth.uid()) OR 
  (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
);
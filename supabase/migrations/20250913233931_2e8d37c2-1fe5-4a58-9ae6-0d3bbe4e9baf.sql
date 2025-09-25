-- Fix the group invitations policy to avoid auth.users table access
DROP POLICY IF EXISTS "Users can view invitations sent to/by them" ON public.group_invitations;

-- Create a simpler policy that works with the profiles table
CREATE POLICY "Users can view their invitations" 
ON public.group_invitations 
FOR SELECT 
USING (
  invited_user_id = auth.uid() OR 
  invited_by = auth.uid() OR
  invited_email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);
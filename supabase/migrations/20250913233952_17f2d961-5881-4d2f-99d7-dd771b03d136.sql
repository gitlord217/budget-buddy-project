-- Drop the problematic policy and create one that doesn't access auth.users
DROP POLICY IF EXISTS "Users can view their invitations" ON public.group_invitations;

-- Create a simple policy that only checks user IDs
CREATE POLICY "Users can view their invitations" 
ON public.group_invitations 
FOR SELECT 
USING (
  invited_user_id = auth.uid() OR 
  invited_by = auth.uid()
);
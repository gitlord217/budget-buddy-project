-- Allow invited users to view group names
CREATE POLICY "Invited users can view group info for their invitations"
ON public.groups
FOR SELECT
USING (
  id IN (
    SELECT group_id 
    FROM public.group_invitations 
    WHERE (invited_user_id = auth.uid() OR invited_email = public.current_user_email())
    AND status = 'pending'
  )
);
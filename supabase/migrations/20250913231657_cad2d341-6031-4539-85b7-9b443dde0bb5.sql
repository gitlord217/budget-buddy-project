-- Update groups SELECT policy to allow creators to view their groups immediately
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
CREATE POLICY "Users can view groups they are members of or created by them"
ON public.groups
FOR SELECT
USING (
  public.is_group_member(id, auth.uid()) OR created_by = auth.uid()
);

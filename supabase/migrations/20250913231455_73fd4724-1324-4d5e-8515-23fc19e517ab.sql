-- Drop ALL existing policies for group_members first
DROP POLICY IF EXISTS "Users can view group members of their groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Group creators and admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_group_member(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_group_admin(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_uuid AND g.created_by = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_uuid AND gm.user_id = user_uuid AND gm.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create new non-recursive policies for group_members
CREATE POLICY "Members can view group member list" 
ON public.group_members 
FOR SELECT 
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Users can join groups via invitations" 
ON public.group_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage group members" 
ON public.group_members 
FOR ALL 
USING (public.is_group_admin(group_id, auth.uid()));
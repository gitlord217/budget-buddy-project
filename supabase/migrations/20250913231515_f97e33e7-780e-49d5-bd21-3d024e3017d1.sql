-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view group members of their groups" ON public.group_members;
DROP POLICY IF EXISTS "Group creators and admins can manage members" ON public.group_members;

-- Create a security definer function to check if user is a group member
CREATE OR REPLACE FUNCTION public.is_group_member(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create a security definer function to check if user is group admin/creator
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
CREATE POLICY "Users can view group members of their groups" 
ON public.group_members 
FOR SELECT 
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Users can join groups" 
ON public.group_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group admins can manage members" 
ON public.group_members 
FOR ALL 
USING (public.is_group_admin(group_id, auth.uid()));

-- Update groups policies to use the new functions
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
CREATE POLICY "Users can view groups they are members of" 
ON public.groups 
FOR SELECT 
USING (public.is_group_member(id, auth.uid()));

-- Update group invitations policies
DROP POLICY IF EXISTS "Users can create invitations for their groups" ON public.group_invitations;
CREATE POLICY "Users can create invitations for their groups" 
ON public.group_invitations 
FOR INSERT 
WITH CHECK (public.is_group_member(group_id, auth.uid()));

-- Update transactions policies to use the new functions
DROP POLICY IF EXISTS "Users can view their own transactions and group transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions and group transactions" 
ON public.transactions 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
);

DROP POLICY IF EXISTS "Users can create their own transactions and group transactions" ON public.transactions;
CREATE POLICY "Users can create their own transactions and group transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND (
    group_id IS NULL OR 
    (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can update their own transactions and group transactions they created" ON public.transactions;
CREATE POLICY "Users can update their own transactions and group transactions they created" 
ON public.transactions 
FOR UPDATE 
USING (
  auth.uid() = user_id AND (
    group_id IS NULL OR 
    (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can delete their own transactions and group transactions they created" ON public.transactions;
CREATE POLICY "Users can delete their own transactions and group transactions they created" 
ON public.transactions 
FOR DELETE 
USING (
  auth.uid() = user_id AND (
    group_id IS NULL OR 
    (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  )
);
-- Allow group members to view categories used in group transactions
-- This policy allows users to see categories that are referenced in group transactions 
-- where they are group members, even if they don't own the category

CREATE POLICY "Group members can view categories used in group transactions" 
ON public.categories 
FOR SELECT 
USING (
  id IN (
    SELECT DISTINCT t.category_id 
    FROM public.transactions t
    JOIN public.group_members gm ON t.group_id = gm.group_id
    WHERE gm.user_id = auth.uid()
    AND t.category_id IS NOT NULL
  )
);
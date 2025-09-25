-- Allow group members to view categories referenced by their group's budgets
CREATE POLICY "Group members can view categories used in group budgets"
ON public.categories
FOR SELECT
USING (
  id IN (
    SELECT DISTINCT gb.category_id
    FROM public.group_budgets gb
    JOIN public.group_members gm ON gb.group_id = gm.group_id
    WHERE gm.user_id = auth.uid()
  )
);

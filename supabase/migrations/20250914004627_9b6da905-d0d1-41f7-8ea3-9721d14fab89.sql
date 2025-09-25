-- Enable realtime for group_budgets table
ALTER TABLE public.group_budgets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_budgets;

-- Ensure categories are accessible to all group members for group budgets
DROP POLICY IF EXISTS "Group members can view categories used in group budgets" ON public.categories;

CREATE POLICY "Group members can view categories used in group budgets" 
ON public.categories 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_budgets gb
    JOIN public.group_members gm ON gb.group_id = gm.group_id
    WHERE gb.category_id = categories.id 
    AND gm.user_id = auth.uid()
  )
);
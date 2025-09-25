-- Create group_budgets table for group-specific budget limits
CREATE TABLE public.group_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id),
  category_id UUID REFERENCES public.categories(id),
  amount NUMERIC NOT NULL,
  period TEXT NOT NULL DEFAULT 'daily',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.group_budgets ENABLE ROW LEVEL SECURITY;

-- Create policies for group budget access
CREATE POLICY "Group members can view group budgets" 
ON public.group_budgets 
FOR SELECT 
USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can create group budgets" 
ON public.group_budgets 
FOR INSERT 
WITH CHECK (is_group_member(group_id, auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Group members can update group budgets" 
ON public.group_budgets 
FOR UPDATE 
USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can delete group budgets" 
ON public.group_budgets 
FOR DELETE 
USING (is_group_member(group_id, auth.uid()));

-- Create groups table total expenditure limit column
ALTER TABLE public.groups 
ADD COLUMN total_expenditure_limit NUMERIC;

-- Create function to update timestamps
CREATE TRIGGER update_group_budgets_updated_at
BEFORE UPDATE ON public.group_budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
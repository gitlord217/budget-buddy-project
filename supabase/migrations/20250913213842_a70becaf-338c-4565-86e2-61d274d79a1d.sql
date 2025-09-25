-- Allow 'daily' budgets by updating the period check constraint
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_period_check;

-- Recreate with expanded allowed values
ALTER TABLE public.budgets
ADD CONSTRAINT budgets_period_check CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly'));

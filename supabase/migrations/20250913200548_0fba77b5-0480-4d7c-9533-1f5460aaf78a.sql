-- Add total expenditure limit to profiles table
ALTER TABLE public.profiles 
ADD COLUMN total_expenditure_limit NUMERIC DEFAULT NULL;

-- Create or update budget management data
-- The existing budgets table will be used for category-specific limits
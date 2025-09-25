-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'folder',
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
CREATE POLICY "Users can view their own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for budgets
CREATE POLICY "Users can view their own budgets" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own budgets" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budgets" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budgets" ON public.budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (user_id, name, color, icon, type) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Food & Dining', '#ef4444', 'utensils', 'expense'),
  ('00000000-0000-0000-0000-000000000000', 'Transportation', '#3b82f6', 'car', 'expense'),
  ('00000000-0000-0000-0000-000000000000', 'Shopping', '#8b5cf6', 'shopping-bag', 'expense'),
  ('00000000-0000-0000-0000-000000000000', 'Entertainment', '#f59e0b', 'gamepad-2', 'expense'),
  ('00000000-0000-0000-0000-000000000000', 'Bills & Utilities', '#10b981', 'receipt', 'expense'),
  ('00000000-0000-0000-0000-000000000000', 'Salary', '#22c55e', 'briefcase', 'income'),
  ('00000000-0000-0000-0000-000000000000', 'Freelance', '#06b6d4', 'laptop', 'income'),
  ('00000000-0000-0000-0000-000000000000', 'Investment', '#14b8a6', 'trending-up', 'income');
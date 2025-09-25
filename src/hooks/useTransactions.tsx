import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  date: string;
  category_id: string | null;
  user_id: string;
  group_id?: string | null;
  categories?: {
    name: string;
    color: string;
    icon: string;
  };
  profiles?: {
    username?: string;
    full_name?: string;
  };
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: 'income' | 'expense';
}

export const useTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      // Simplified query to avoid complex joins that cause schema cache issues
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            name,
            color,
            icon
          ),
          profiles (
            username,
            full_name
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchCategories = async () => {
    if (!user) return;

    try {
      // Get user's own categories
      const { data: userCategories, error: userError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);

      if (userError) throw userError;

      // Get all group IDs where user is a member
      const { data: userGroups, error: groupsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (groupsError) {
        console.log('User groups fetch error:', groupsError);
      }

      let groupCategories: any[] = [];
      
      // If user is in groups, get categories used in those groups
      if (userGroups && userGroups.length > 0) {
        const groupIds = userGroups.map(g => g.group_id);
        
        // Get categories used in group transactions
        const { data: transactionCategories, error: transError } = await supabase
          .from('transactions')
          .select('category_id, categories(*)')
          .in('group_id', groupIds)
          .not('category_id', 'is', null);

        if (!transError && transactionCategories) {
          groupCategories = transactionCategories
            .map(t => t.categories)
            .filter(c => c != null);
        }
      }

      // Combine all categories and remove duplicates
      const allCategories = [
        ...(userCategories || []),
        ...groupCategories
      ];
      
      const uniqueCategories = allCategories.filter((cat, index, self) => 
        index === self.findIndex(c => c.id === cat.id)
      );

      // If user has no categories, create some defaults
      if (!userCategories || userCategories.length === 0) {
        const defaultCategories = [
          { name: 'Food & Dining', color: '#ef4444', icon: 'utensils', type: 'expense' as const, user_id: user.id },
          { name: 'Transportation', color: '#3b82f6', icon: 'car', type: 'expense' as const, user_id: user.id },
          { name: 'Shopping', color: '#8b5cf6', icon: 'shopping-bag', type: 'expense' as const, user_id: user.id },
          { name: 'Entertainment', color: '#f59e0b', icon: 'gamepad-2', type: 'expense' as const, user_id: user.id },
          { name: 'Bills & Utilities', color: '#10b981', icon: 'receipt', type: 'expense' as const, user_id: user.id },
          { name: 'Healthcare', color: '#ec4899', icon: 'heart', type: 'expense' as const, user_id: user.id },
          { name: 'Salary', color: '#22c55e', icon: 'briefcase', type: 'income' as const, user_id: user.id },
          { name: 'Freelance', color: '#06b6d4', icon: 'laptop', type: 'income' as const, user_id: user.id },
          { name: 'Investment', color: '#14b8a6', icon: 'trending-up', type: 'income' as const, user_id: user.id },
          { name: 'Gift', color: '#f97316', icon: 'gift', type: 'income' as const, user_id: user.id }
        ];

        const { data: newCategories, error: insertError } = await supabase
          .from('categories')
          .insert(defaultCategories)
          .select();

        if (insertError) throw insertError;
        
        // Combine new categories with any group categories
        setCategories([...(newCategories || []), ...groupCategories] as Category[]);
      } else {
        setCategories(uniqueCategories as Category[]);
      }
    } catch (error: any) {
      // If there's an error, provide some fallback categories
      const fallbackCategories: Category[] = [
        { id: 'temp-1', name: 'Food & Dining', color: '#ef4444', icon: 'utensils', type: 'expense' },
        { id: 'temp-2', name: 'Transportation', color: '#3b82f6', icon: 'car', type: 'expense' },
        { id: 'temp-3', name: 'Shopping', color: '#8b5cf6', icon: 'shopping-bag', type: 'expense' },
        { id: 'temp-4', name: 'Entertainment', color: '#f59e0b', icon: 'gamepad-2', type: 'expense' },
        { id: 'temp-5', name: 'Salary', color: '#22c55e', icon: 'briefcase', type: 'income' },
        { id: 'temp-6', name: 'Freelance', color: '#06b6d4', icon: 'laptop', type: 'income' },
      ];
      setCategories(fallbackCategories);
      
      toast({
        title: "Note",
        description: "Using default categories. Some features may be limited.",
        variant: "default"
      });
    }
  };

  const addTransaction = async (transactionData: {
    amount: number;
    description: string;
    type: 'income' | 'expense';
    date: string;
    category_id: string | null;
  }) => {
    if (!user) return;

    try {
      // Optimistically add to local state for immediate UI update
      const tempTransaction: Transaction = {
        id: `temp-${Date.now()}`,
        amount: transactionData.amount,
        description: transactionData.description,
        type: transactionData.type,
        date: transactionData.date,
        category_id: transactionData.category_id,
        user_id: user.id,
        categories: transactionData.category_id ? 
          categories.find(cat => cat.id === transactionData.category_id) || null : null
      };

      // Update local state immediately
      setTransactions(prev => [tempTransaction, ...prev]);

      // Save to database
      const { error } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          user_id: user.id
        });

      if (error) throw error;

      // Refresh from database to get the real ID and ensure consistency
      await fetchTransactions();
      
      toast({
        title: "Success",
        description: "Transaction added successfully"
      });
    } catch (error: any) {
      // Remove optimistic update on error
      setTransactions(prev => prev.filter(t => !t.id.startsWith('temp-')));
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteTransaction = async (id: string) => {
    // Keep a snapshot outside try/catch for rollback
    const originalTransactions = transactions;
    try {
      // Optimistically remove from local state for immediate UI update
      setTransactions(prev => prev.filter(t => t.id !== id));

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transaction deleted successfully"
      });
    } catch (error: any) {
      // Restore original state on error
      setTransactions(originalTransactions);
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([fetchCategories(), fetchTransactions()]).finally(() => {
        setLoading(false);
      });

      // Set up real-time subscription for transactions
      const channel = supabase
        .channel('transactions_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Real-time transaction update:', payload);
            // Refetch transactions when any change happens
            fetchTransactions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = totalIncome - totalExpenses;

  return {
    transactions,
    categories,
    loading,
    totalIncome,
    totalExpenses,
    balance,
    addTransaction,
    deleteTransaction,
    fetchTransactions,
  };
};
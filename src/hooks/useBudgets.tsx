import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  period: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  total_expenditure_limit: number | null;
  created_at: string;
  updated_at: string;
}

export const useBudgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBudgets = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id);

      if (budgetsError) {
        console.error('Error fetching budgets:', budgetsError);
        return;
      }

      setBudgets(budgetsData || []);
    } catch (error) {
      console.error('Error in fetchBudgets:', error);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  }, []);

  const setBudgetLimit = useCallback(async (categoryId: string, amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Validate category id is a UUID (avoid fallback temp ids)
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (!isUuid.test(categoryId)) {
        throw new Error('Invalid category. Please pick a real category.');
      }

      // Check if budget already exists for this category
      const existingBudget = budgets.find(b => b.category_id === categoryId);
      
      if (existingBudget) {
        // Update existing budget
        // Ensure existing budgets are updated to daily and active for today
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 1);

        const { error } = await supabase
          .from('budgets')
          .update({ 
            amount,
            period: 'daily',
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBudget.id);

        if (error) throw error;
      } else {
        // Create new budget - Daily budget
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 1); // Daily budget

        const { error } = await supabase
          .from('budgets')
          .insert({
            user_id: user.id,
            category_id: categoryId,
            amount,
            period: 'daily',
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd')
          });

        if (error) throw error;
      }

      await fetchBudgets();
      toast({
        title: "Daily Budget Updated",
        description: "Daily category budget limit has been set successfully.",
      });
    } catch (error: any) {
      console.error('Error setting budget limit:', error);
      toast({
        title: "Error",
        description: `Failed to set budget limit: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  }, [budgets, fetchBudgets, toast]);

  const setTotalExpenditureLimit = useCallback(async (amount: number | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          total_expenditure_limit: amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchProfile();
      toast({
        title: "Daily Total Limit Updated",
        description: "Daily total expenditure limit has been set successfully.",
      });
    } catch (error: any) {
      console.error('Error setting total expenditure limit:', error);
      toast({
        title: "Error",
        description: "Failed to set total expenditure limit. Please try again.",
        variant: "destructive",
      });
    }
  }, [fetchProfile, toast]);

  const removeBudgetLimit = useCallback(async (categoryId: string) => {
    try {
      const budget = budgets.find(b => b.category_id === categoryId);
      if (!budget) return;

      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budget.id);

      if (error) throw error;

      await fetchBudgets();
      toast({
        title: "Daily Budget Removed",
        description: "Daily category budget limit has been removed.",
      });
    } catch (error: any) {
      console.error('Error removing budget limit:', error);
      toast({
        title: "Error",
        description: "Failed to remove budget limit. Please try again.",
        variant: "destructive",
      });
    }
  }, [budgets, fetchBudgets, toast]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBudgets(), fetchProfile()]);
      setLoading(false);
    };

    loadData();

    // Subscribe to realtime changes so all components stay in sync
    let budgetsChannel: any = null;
    let profilesChannel: any = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      budgetsChannel = supabase
        .channel('budgets_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${user.id}` },
          () => {
            fetchBudgets();
          }
        )
        .subscribe();

      profilesChannel = supabase
        .channel('profiles_changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
          () => {
            fetchProfile();
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (budgetsChannel) supabase.removeChannel(budgetsChannel);
      if (profilesChannel) supabase.removeChannel(profilesChannel);
    };
  }, [fetchBudgets, fetchProfile]);

  return {
    budgets,
    profile,
    loading,
    setBudgetLimit,
    setTotalExpenditureLimit,
    removeBudgetLimit,
    refetch: () => Promise.all([fetchBudgets(), fetchProfile()])
  };
};
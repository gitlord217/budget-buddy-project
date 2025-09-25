import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface GroupBudget {
  id: string;
  group_id: string;
  category_id: string | null;
  category_name: string;
  category_color: string;
  amount: number;
  period: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  categories?: {
    id: string;
    name: string;
    color: string;
    icon: string;
    type: string;
  };
}

export interface GroupInfo {
  id: string;
  name: string;
  description?: string;
  total_expenditure_limit?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useGroupBudgets = (groupId: string, categories: any[] = []) => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<GroupBudget[]>([]);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGroupBudgets = useCallback(async () => {
    if (!user || !groupId) return;

    try {
      // Fetch all group budgets with category information
      const { data: budgetData, error } = await supabase
        .from('group_budgets')
        .select(`
          *,
          categories (
            id,
            name,
            color,
            icon,
            type
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include category name and color directly
      const transformedBudgets = (budgetData || []).map(budget => ({
        ...budget,
        category_name: budget.categories?.name || 'Unknown',
        category_color: budget.categories?.color || '#64748b'
      }));

      setBudgets(transformedBudgets);
    } catch (error) {
      console.error('Error fetching group budgets:', error);
      setBudgets([]);
    }
  }, [user, groupId]);

  const fetchGroupInfo = useCallback(async () => {
    if (!user || !groupId) return;

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;

      setGroupInfo(data);
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
  }, [user, groupId]);

  useEffect(() => {
    if (user && groupId) {
      Promise.all([fetchGroupBudgets(), fetchGroupInfo()]).finally(() => {
        setLoading(false);
      });

      // Set up real-time subscriptions with unique channel names
      const budgetChannel = supabase
        .channel(`group_budgets_changes_${groupId}_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'group_budgets',
            filter: `group_id=eq.${groupId}`
          },
          (payload) => {
            console.log('Group budget change detected:', payload);
            fetchGroupBudgets();
          }
        )
        .subscribe();

      const groupChannel = supabase
        .channel(`groups_changes_${groupId}_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'groups',
            filter: `id=eq.${groupId}`
          },
          (payload) => {
            console.log('Group info change detected:', payload);
            fetchGroupInfo();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(budgetChannel);
        supabase.removeChannel(groupChannel);
      };
    }
  }, [user, groupId, fetchGroupBudgets, fetchGroupInfo]);

  const setBudgetLimit = useCallback(async (categoryName: string, categoryColor: string, amount: number) => {
    if (!user || !groupId) return;

    try {
      const currentDate = new Date();
      const startDate = currentDate.toISOString().split('T')[0];
      const endDate = new Date(currentDate.getFullYear(), 11, 31).toISOString().split('T')[0];

      // Check if budget already exists for this category name (not ID)
      const existingBudget = budgets.find(b => 
        b.category_name === categoryName && 
        b.period === 'daily'
      );

      if (existingBudget) {
        // Update existing budget
        const { error } = await supabase
          .from('group_budgets')
          .update({ amount })
          .eq('id', existingBudget.id);

        if (error) throw error;
      } else {
        // Find any category with this name that the user can access
        const userCategory = categories.find(c => c.name === categoryName && c.type === 'expense');
        
        if (!userCategory) {
          throw new Error(`Category "${categoryName}" not found`);
        }

        // Create new budget using the user's category ID
        const { error } = await supabase
          .from('group_budgets')
          .insert({
            group_id: groupId,
            category_id: userCategory.id,
            amount,
            period: 'daily',
            start_date: startDate,
            end_date: endDate,
            created_by: user.id
          });

        if (error) throw error;
      }

      toast({
        title: "Success!",
        description: "Budget limit updated successfully.",
      });

      await fetchGroupBudgets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [user, groupId, budgets, categories, fetchGroupBudgets]);

  const setTotalExpenditureLimit = useCallback(async (amount: number | null) => {
    if (!user || !groupId) return;

    try {
      if (amount === null) {
        // Call RPC function to remove limit
        const { error } = await supabase
          .rpc('remove_group_total_expenditure_limit', {
            group_uuid: groupId
          });

        if (error) throw error;
      } else {
        // Call RPC function to set limit
        const { error } = await supabase
          .rpc('set_group_total_expenditure_limit', {
            group_uuid: groupId,
            new_limit: amount
          });

        if (error) throw error;
      }

      toast({
        title: "Success!",
        description: "Total expenditure limit updated successfully.",
      });

      await fetchGroupInfo();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [user, groupId, fetchGroupInfo]);

  const removeBudgetLimit = useCallback(async (categoryName: string) => {
    if (!user || !groupId) return;

    try {
      // Find budget by category name, not ID
      const budgetToRemove = budgets.find(b => 
        b.category_name === categoryName && 
        b.period === 'daily'
      );

      if (!budgetToRemove) {
        throw new Error('Budget limit not found');
      }

      const { error } = await supabase
        .from('group_budgets')
        .delete()
        .eq('id', budgetToRemove.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Budget limit removed successfully.",
      });

      await fetchGroupBudgets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [user, groupId, budgets, fetchGroupBudgets]);

  const removeTotalExpenditureLimit = useCallback(async () => {
    if (!user || !groupId) return;

    try {
      // Call RPC function to remove limit
      const { error } = await supabase
        .rpc('remove_group_total_expenditure_limit', {
          group_uuid: groupId
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Total expenditure limit removed successfully.",
      });

      await fetchGroupInfo();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [user, groupId, fetchGroupInfo]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchGroupBudgets(), fetchGroupInfo()]);
  }, [fetchGroupBudgets, fetchGroupInfo]);

  return {
    budgets,
    groupInfo,
    loading,
    setBudgetLimit,
    setTotalExpenditureLimit,
    removeBudgetLimit,
    removeTotalExpenditureLimit,
    refetch
  };
};
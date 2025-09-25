import React, { useState, useEffect } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, DollarSign, TrendingUp, TrendingDown, Plus, Settings } from 'lucide-react';
import { AddTransactionDialog } from '@/components/AddTransactionDialog';
import { TransactionsList } from '@/components/TransactionsList';
import { GroupBudgetOverview } from '@/components/GroupBudgetOverview';
import { GroupAdvancedBudgetDialog } from '@/components/GroupAdvancedBudgetDialog';
import { useTransactions } from '@/hooks/useTransactions';
import { InviteToGroupDialog } from '@/components/InviteToGroupDialog';
import { GroupMembersDialog } from '@/components/GroupMembersDialog';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const GroupDashboard = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use transactions hook but filter for group transactions
  const { 
    transactions, 
    categories, 
    loading: transactionsLoading, 
    addTransaction, 
    deleteTransaction,
    totalIncome,
    totalExpenses,
    balance
  } = useTransactions();

  // Filter transactions for this group
  const groupTransactions = transactions.filter(t => t.group_id === groupId);
  
  // Calculate group-specific totals
  const groupTotalIncome = groupTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const groupTotalExpenses = groupTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const groupBalance = groupTotalIncome - groupTotalExpenses;
  const groupTransactionCount = groupTransactions.length;

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!user || !groupId) return;

      try {
        // Fetch group details
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();

        if (groupError) throw groupError;

        // Check if user is a member of this group
        const { data: membershipData, error: membershipError } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .single();

        if (membershipError) {
          navigate('/groups');
          return;
        }

        // Fetch group members with profile data
        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select(`
            *,
            profiles(username, full_name)
          `)
          .eq('group_id', groupId);

        if (membersError) throw membersError;

        setGroup({ ...groupData, user_role: membershipData.role });
        setGroupMembers(membersData || []);
      } catch (error) {
        console.error('Error fetching group data:', error);
        navigate('/groups');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [user, groupId, navigate]);

  // Calculate member spending analytics
  const memberSpendingData = groupMembers.map(member => {
    const memberTransactions = groupTransactions.filter(t => t.user_id === member.user_id);
    const expenses = memberTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const income = memberTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    
    return {
      name: member.profiles?.full_name || member.profiles?.username || 'Unknown',
      expenses,
      income,
      transactions: memberTransactions.length
    };
  });

  const expenseChartData = memberSpendingData.filter(m => m.expenses > 0);
  const incomeChartData = memberSpendingData.filter(m => m.income > 0);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!group) {
    return <Navigate to="/groups" replace />;
  }

  const handleAddTransaction = async (transactionData: any) => {
    // Add group_id to transaction data
    const groupTransactionData = {
      ...transactionData,
      group_id: groupId
    };
    
    await addTransaction(groupTransactionData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 space-y-4">
          {/* Title and Back Button Row */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/groups')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{group.name}</h1>
              <p className="text-gray-300">{group.description || 'Group Dashboard'}</p>
            </div>
          </div>
          
          {/* Action Buttons Row */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              <GroupMembersDialog groupId={groupId!} groupName={group.name} members={groupMembers} />
              <InviteToGroupDialog groupId={groupId!} groupName={group.name} />
            </div>
            <div className="flex gap-2">
              <GroupAdvancedBudgetDialog groupId={groupId!} categories={categories}>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Group Budgets
                </Button>
              </GroupAdvancedBudgetDialog>
              <AddTransactionDialog categories={categories} onAdd={handleAddTransaction}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </AddTransactionDialog>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Group Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${groupBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {"\u20B9"}{groupBalance.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {"\u20B9"}{groupTotalIncome.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {"\u20B9"}{groupTotalExpenses.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {groupTransactionCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Group Analytics</TabsTrigger>
            <TabsTrigger value="budget">Budget & Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <TransactionsList
              transactions={groupTransactions}
              onDelete={deleteTransaction}
              loading={transactionsLoading}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Member Expenses Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Who Spends More</CardTitle>
                  <CardDescription>
                    Breakdown of expenses by group members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {expenseChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={expenseChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: \u20B9${value.toFixed(2)}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="expenses"
                        >
                          {expenseChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`\u20B9${Number(value).toFixed(2)}`, 'Expenses']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No expense data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Member Income Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Who Contributes More</CardTitle>
                  <CardDescription>
                    Breakdown of income contributions by group members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {incomeChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={incomeChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: \u20B9${value.toFixed(2)}`}
                          outerRadius={80}
                          fill="#82ca9d"
                          dataKey="income"
                        >
                          {incomeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`\u20B9${Number(value).toFixed(2)}`, 'Income']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No income data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Member Statistics Table */}
            <Card>
              <CardHeader>
                <CardTitle>Member Statistics</CardTitle>
                <CardDescription>
                  Detailed breakdown of each member's contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Member</th>
                        <th className="text-right py-2">Income</th>
                        <th className="text-right py-2">Expenses</th>
                        <th className="text-right py-2">Net</th>
                        <th className="text-right py-2">Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberSpendingData.map((member, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">{member.name}</td>
                          <td className="text-right py-2 text-green-600">
                            {"\u20B9"}{member.income.toFixed(2)}
                          </td>
                          <td className="text-right py-2 text-red-600">
                            {"\u20B9"}{member.expenses.toFixed(2)}
                          </td>
                          <td className={`text-right py-2 ${
                            (member.income - member.expenses) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {"\u20B9"}{(member.income - member.expenses).toFixed(2)}
                          </td>
                          <td className="text-right py-2">{member.transactions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget">
            <GroupBudgetOverview 
              groupId={groupId!}
              transactions={groupTransactions} 
              categories={categories}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GroupDashboard;
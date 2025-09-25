import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTransactions } from '@/hooks/useTransactions';
import { AddTransactionDialog } from '@/components/AddTransactionDialog';
import { TransactionsList } from '@/components/TransactionsList';
import { BudgetOverview } from '@/components/BudgetOverview';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { AdvancedBudgetDialog } from '@/components/AdvancedBudgetDialog';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { formatCurrency } from '@/lib/currency';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const { 
    transactions, 
    categories, 
    loading: transactionsLoading,
    addTransaction,
    deleteTransaction
  } = useTransactions();

  // Filter personal transactions (exclude group transactions)
  const personalTransactions = transactions.filter(t => !t.group_id);

  // Calculate personal totals from filtered transactions
  const personalTotalIncome = personalTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const personalTotalExpenses = personalTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const personalBalance = personalTotalIncome - personalTotalExpenses;

  // Redirect to auth if not authenticated
  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Personal Budget Tracker</h1>
            <p className="text-muted-foreground">Welcome back, {user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <AdvancedBudgetDialog categories={categories} />
            <AddTransactionDialog categories={categories} onAdd={addTransaction} />
            <Button onClick={() => window.location.href = '/groups'}>Groups</Button>
            <ProfileDropdown user={user} onSignOut={signOut} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={personalBalance >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(personalBalance)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Current balance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(personalTotalIncome)}
              </div>
              <p className="text-xs text-muted-foreground">
                All time income
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(personalTotalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                All time expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {personalTransactions.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Total transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="budget">Budget & Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions" className="space-y-6">
            <TransactionsList 
              transactions={personalTransactions}
              onDelete={deleteTransaction}
              loading={transactionsLoading}
            />
          </TabsContent>
          
          <TabsContent value="budget" className="space-y-6">
            <BudgetOverview 
              transactions={personalTransactions}
              categories={categories}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
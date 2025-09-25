import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Trash2, AlertTriangle } from 'lucide-react';
import { Transaction } from '@/hooks/useTransactions';
import { useAuth } from '@/hooks/useAuth';
import { ViewTransactionDialog } from './ViewTransactionDialog';
import { useBudgets } from '@/hooks/useBudgets';
import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency, formatDateStringIST, getCurrentDateIST } from '@/lib/currency';

interface TransactionsListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  loading?: boolean;
}

export const TransactionsList = ({ transactions, onDelete, loading }: TransactionsListProps) => {
  const { user } = useAuth();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const { budgets, profile } = useBudgets();

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setViewDialogOpen(true);
  };

  // helpers
  const normalizeDateStr = (d: string | Date) => {
    try {
      if (typeof d === 'string') return d.slice(0, 10);
      return format(d, 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };
  const normalizeType = (t: string | null | undefined) => (t ?? '').toString().trim().toLowerCase();

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => normalizeType(t.type) === typeFilter);
    }

    // Sort by date (avoid mutating props)
    const sorted = [...filtered].sort((a, b) => {
      const aDate = normalizeDateStr(a.date);
      const bDate = normalizeDateStr(b.date);

      if (aDate !== bDate) {
        return sortOrder === 'newest'
          ? bDate.localeCompare(aDate)
          : aDate.localeCompare(bDate);
      }

      const aCreated = (a as any).created_at ? String((a as any).created_at) : '';
      const bCreated = (b as any).created_at ? String((b as any).created_at) : '';
      if (aCreated !== bCreated) {
        return sortOrder === 'newest'
          ? bCreated.localeCompare(aCreated)
          : aCreated.localeCompare(bCreated);
      }

      // Fallback to id to ensure stable ordering
      return sortOrder === 'newest'
        ? String(b.id).localeCompare(String(a.id))
        : String(a.id).localeCompare(String(b.id));
    });

    // Debug
    console.debug('[TransactionsList] sortOrder:', sortOrder, 'typeFilter:', typeFilter, {
      beforeCount: transactions.length,
      afterCount: sorted.length,
      firstDates: sorted.slice(0, 3).map(t => normalizeDateStr(t.date)),
    });

    return sorted;
  }, [transactions, typeFilter, sortOrder]);

  // Check if a transaction exceeds budget limits
  const checkBudgetViolations = useMemo(() => {
    const currentDate = new Date();
    const todayStr = format(currentDate, 'yyyy-MM-dd');
    
    return (transaction: Transaction) => {
      if (transaction.type !== 'expense') return { violations: [], isViolation: false };
      
      const violations: string[] = [];
      
      // Check category budget limit
      if (transaction.category_id) {
        const categoryBudget = budgets.find(b => b.category_id === transaction.category_id);
        if (categoryBudget) {
          // Calculate spending in this category for current day
          const categorySpending = transactions
            .filter(t => 
              t.category_id === transaction.category_id && 
              t.type === 'expense' && 
              t.date === todayStr
            )
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          if (categorySpending > categoryBudget.amount) {
            violations.push(`Daily category budget exceeded: ${formatCurrency(categorySpending)} / ${formatCurrency(categoryBudget.amount)}`);
          }
        }
      }
      
      // Check total expenditure limit  
      if (profile?.total_expenditure_limit) {
        const totalDailySpending = transactions
          .filter(t => 
            t.type === 'expense' && 
            t.date === todayStr
          )
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        if (totalDailySpending > profile.total_expenditure_limit) {
          violations.push(`Total daily limit exceeded: ${formatCurrency(totalDailySpending)} / ${formatCurrency(profile.total_expenditure_limit)}`);
        }
      }
      
      return { violations, isViolation: violations.length > 0 };
    };
  }, [budgets, profile, transactions]);
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full" />
                    <div className="space-y-1">
                      <div className="h-4 bg-muted rounded w-32" />
                      <div className="h-3 bg-muted rounded w-20" />
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <div className="flex gap-2">
            <Select value={sortOrder} onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Newest First" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value: 'all' | 'income' | 'expense') => setTypeFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income Only</SelectItem>
                <SelectItem value="expense">Expenses Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAndSortedTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No transactions match your filters.</p>
            <p className="text-sm">Try adjusting your filter settings!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedTransactions.map((transaction) => {
              const budgetCheck = checkBudgetViolations(transaction);
              
              return (
                <div key={transaction.id} className="space-y-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{transaction.description}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <span>{format(new Date(transaction.date), 'MMM dd, yyyy')}</span>
                            {transaction.group_id && transaction.profiles && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 font-medium">
                                  {transaction.profiles.full_name || transaction.profiles.username || 'Unknown Member'}
                                </span>
                              </>
                            )}
                            {transaction.categories && (
                              <>
                                <span>•</span>
                                 <span className="flex items-center gap-1">
                                   <span 
                                     className="w-3 h-3 rounded-full inline-block" 
                                     style={{ backgroundColor: transaction.categories.color }} 
                                   />
                                   <span>{transaction.categories.name}</span>
                                 </span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTransaction(transaction)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Only show delete button if the transaction belongs to the current user */}
                          {user && transaction.user_id === user.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDelete(transaction.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Amount</span>
                        <span className={`text-lg font-semibold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {budgetCheck.isViolation && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="space-y-1">
                        <div className="font-medium">Budget Limit Exceeded!</div>
                        {budgetCheck.violations.map((violation, index) => (
                          <div key={index} className="text-sm">{violation}</div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        <ViewTransactionDialog
          transaction={selectedTransaction}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
        />
      </CardContent>
    </Card>
  );
};
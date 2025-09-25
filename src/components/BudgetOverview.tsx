import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart, BarChart, Bar } from 'recharts';
import { Transaction, Category } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { useState, useMemo, useEffect } from 'react';
import { format, startOfHour, startOfDay, startOfWeek, startOfMonth, addHours, addDays, addWeeks, addMonths, endOfMonth } from 'date-fns';
import { formatCurrency, formatDateStringIST, getCurrentDateIST } from '@/lib/currency';

interface BudgetOverviewProps {
  transactions: Transaction[];
  categories: Category[];
}

export const BudgetOverview = ({ transactions, categories }: BudgetOverviewProps) => {
  const [timelineFilter, setTimelineFilter] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'months'>('days');
  const { budgets, profile, refetch } = useBudgets();

  // Ensure immediate UI update when budgets are changed elsewhere
  useEffect(() => {
    const handler = () => { refetch(); };
    window.addEventListener('budgets:changed', handler);
    return () => window.removeEventListener('budgets:changed', handler);
  }, [refetch]);
  // Normalize transaction date to 'yyyy-MM-dd' regardless of timezone/format
  const normalizeDateStr = (d: string | Date) => {
    try {
      if (typeof d === 'string') return d.slice(0, 10);
      return format(d, 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  // Calculate balance over time based on selected timeline
  const balanceTimeline = useMemo(() => {
    if (transactions.length === 0) return [];

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const now = new Date();
    const firstTxDate = new Date(sortedTransactions[0].date);

    // Create timeline data points based on filter
    let uniqueDates: string[] = [];
    
    if (timelineFilter === 'minutes') {
      // For minutes view, create minute-by-minute timeline from first transaction to now
      const startTime = new Date(firstTxDate);
      startTime.setSeconds(0, 0); // Round to minute
      const endTime = new Date(now);
      endTime.setSeconds(59, 999); // Round to end of minute
      
      const current = new Date(startTime);
      while (current <= endTime) {
        uniqueDates.push(current.toISOString());
        current.setMinutes(current.getMinutes() + 1);
      }
    } else {
      // For other views, use transaction dates plus today
      uniqueDates = [...new Set([
        ...sortedTransactions.map(t => t.date),
        format(now, 'yyyy-MM-dd')
      ])].sort();
    }

    // Calculate running balance for each date
    let runningBalance = 0;
    const timelineData = uniqueDates.map((dateStr, index) => {
      const currentDate = new Date(dateStr);
      
      // Get all transactions up to and including this date
      const transactionsUpToDate = sortedTransactions.filter(t => 
        new Date(t.date) <= currentDate
      );

      // Calculate running balance
      runningBalance = transactionsUpToDate.reduce((sum, t) => {
        const amount = Number(t.amount);
        return sum + (t.type === 'income' ? amount : -amount);
      }, 0);

      // Get transactions specifically on this date/time
      const todaysTransactions = timelineFilter === 'minutes'
        ? sortedTransactions.filter(t => {
            const txDate = new Date(t.date);
            const currentMinute = new Date(currentDate);
            // For minutes view, match transactions to the first minute of their date
            // since transaction dates typically don't include time
            return txDate.getFullYear() === currentMinute.getFullYear() &&
                   txDate.getMonth() === currentMinute.getMonth() &&
                   txDate.getDate() === currentMinute.getDate() &&
                   currentMinute.getHours() === 0 && 
                   currentMinute.getMinutes() === 0;
          })
        : sortedTransactions.filter(t => t.date === dateStr);
      const todaysChange = todaysTransactions.reduce((sum, t) => {
        const amount = Number(t.amount);
        return sum + (t.type === 'income' ? amount : -amount);
      }, 0);

      const income = todaysTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expenses = todaysTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Format date based on timeline filter
      let formatStr = 'MMM dd';
      switch (timelineFilter) {
        case 'minutes':
          formatStr = 'HH:mm:ss';
          break;
        case 'hours':
          formatStr = 'MMM dd HH:mm';
          break;
        case 'days':
          formatStr = 'MMM dd';
          break;
        case 'weeks':
          formatStr = 'MMM dd';
          break;
        case 'months':
          formatStr = 'MMM yyyy';
          break;
      }

      return {
        period: format(currentDate, formatStr),
        balance: runningBalance,
        income,
        expenses,
        change: todaysChange,
        date: currentDate,
        hasTransactions: todaysTransactions.length > 0
      };
    });

    // For minutes view, only show data points with transactions or every 10th minute to avoid clutter
    if (timelineFilter === 'minutes') {
      return timelineData.filter((item, index) => 
        item.hasTransactions || index % 10 === 0
      );
    }

    return timelineData;
  }, [transactions, timelineFilter]);

  // Custom tooltip for balance chart
  const BalanceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-4 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">Balance: </span>
              <span className={data.balance >= 0 ? "text-green-600" : "text-red-600"}>
                {formatCurrency(data.balance)}
              </span>
            </p>
            {data.income > 0 && (
              <p className="text-sm">
                <span className="font-medium">Income: </span>
                <span className="text-green-600">+{formatCurrency(data.income)}</span>
              </p>
            )}
            {data.expenses > 0 && (
              <p className="text-sm">
                <span className="font-medium">Expenses: </span>
                <span className="text-red-600">-{formatCurrency(data.expenses)}</span>
              </p>
            )}
            {data.hasTransactions && (
              <p className="text-xs text-muted-foreground mt-1">
                Transactions on this date
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };
  // Calculate spending by category
  const categorySpending = categories.map(category => {
    const categoryTransactions = transactions.filter(
      t => t.category_id === category.id && t.type === 'expense'
    );
    const total = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    
    return {
      name: category.name,
      value: total,
      color: category.color,
      transactions: categoryTransactions.length
    };
  }).filter(item => item.value > 0);

  // Calculate income by category
  const categoryIncome = categories.map(category => {
    const categoryTransactions = transactions.filter(
      t => t.category_id === category.id && t.type === 'income'
    );
    const total = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    
    return {
      name: category.name,
      value: total,
      color: category.color,
      transactions: categoryTransactions.length
    };
  }).filter(item => item.value > 0);

  // Calculate budget progress data
  const budgetProgressData = useMemo(() => {
    const currentDate = getCurrentDateIST();
    const todayStr = formatDateStringIST(currentDate);

    const activeBudgets = budgets.filter((budget) => {
      // Only consider daily budgets that are active for today
      if (budget.period !== 'daily') return false;
      if (!budget.category_id) return false;
      return budget.start_date <= todayStr && todayStr <= budget.end_date;
    });
    
    return activeBudgets.map(budget => {
      const category = categories.find(c => c.id === budget.category_id);
      if (!category) return null;
      
      // Gather all category ids that share the same name (handles duplicate categories)
      const sameNameCategoryIds = categories
        .filter(c => c.type === 'expense' && c.name === category.name)
        .map(c => c.id);
      
      // Calculate current spending for this category name today across duplicates
      const categorySpending = transactions
        .filter(t => 
          t.type === 'expense' && 
          normalizeDateStr(t.date) === todayStr &&
          t.category_id !== null &&
          sameNameCategoryIds.includes(t.category_id)
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const budgetAmount = Number(budget.amount);
      const percentage = budgetAmount > 0 ? (categorySpending / budgetAmount) * 100 : 0;
      const isOverBudget = percentage > 100;
      
      return {
        name: category.name,
        spent: categorySpending,
        budget: budgetAmount,
        percentage: Math.min(percentage, 100),
        actualPercentage: percentage,
        isOverBudget,
        color: category.color,
        overspent: isOverBudget ? categorySpending - budgetAmount : 0
      };
    }).filter(Boolean);
  }, [budgets, categories, transactions]);

  // Check total expenditure limit
  const totalExpenditureStatus = useMemo(() => {
    if (!profile?.total_expenditure_limit) return null;
    
    const currentDate = getCurrentDateIST();
    const todayStr = formatDateStringIST(currentDate);
    
    const totalSpent = transactions
      .filter(t => 
        t.type === 'expense' && 
        normalizeDateStr(t.date) === todayStr
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const percentage = (totalSpent / profile.total_expenditure_limit) * 100;
    const isOverLimit = percentage > 100;
    
    return {
      spent: totalSpent,
      limit: profile.total_expenditure_limit,
      percentage: Math.min(percentage, 100),
      actualPercentage: percentage,
      isOverLimit,
      overspent: isOverLimit ? totalSpent - profile.total_expenditure_limit : 0
    };
  }, [profile, transactions]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)} ({data.transactions} transactions)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Balance Timeline Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Balance Timeline
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
            </CardTitle>
            <div className="px-2 py-1 text-sm text-muted-foreground border rounded">
              Daily
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceTimeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `₹${value.toFixed(0)}`}
                  />
                  <Tooltip content={<BalanceTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={(props) => {
                      const { cx, cy, payload } = props as any;
                      const color = payload.change > 0 ? '#10b981' : payload.change < 0 ? '#ef4444' : '#6b7280';
                      return <circle cx={cx} cy={cy} fill={color} stroke={color} strokeWidth={2} r={4} />;
                    }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                  />
                </LineChart>
            </ResponsiveContainer>
          </div>
          {transactions.length === 0 && (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">No transaction data yet</div>
                <div className="text-sm">Add some transactions to see your balance timeline!</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Spending by Category Chart */}
      {categorySpending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySpending}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categorySpending.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income by Category Chart */}
      {categoryIncome.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Income by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryIncome}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryIncome.map((entry, index) => (
                      <Cell key={`income-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Progress Chart */}
      {(budgetProgressData.length > 0 || totalExpenditureStatus) && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Limits Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Total Expenditure Limit */}
            {totalExpenditureStatus && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Daily Expenditure</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(totalExpenditureStatus.spent)} / {formatCurrency(totalExpenditureStatus.limit)}
                  </span>
                </div>
                <Progress 
                  value={totalExpenditureStatus.percentage} 
                  className={`h-3 ${totalExpenditureStatus.isOverLimit ? 'bg-red-100' : ''}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{totalExpenditureStatus.actualPercentage.toFixed(1)}% used</span>
                  {totalExpenditureStatus.isOverLimit && (
                    <span className="text-red-600 font-medium">
                      {formatCurrency(totalExpenditureStatus.overspent)} over limit
                    </span>
                  )}
                </div>
                {totalExpenditureStatus.isOverLimit && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      You have exceeded your total daily expenditure limit by {formatCurrency(totalExpenditureStatus.overspent)}!
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {budgetProgressData.length > 0 && (
              <>
                {totalExpenditureStatus && <div className="border-t pt-6" />}
                
                {/* Category Budget Progress */}
                <div className="space-y-6">
                  <h4 className="font-medium">Daily Category Budget Limits</h4>
                  {budgetProgressData.map((item: any) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                        </span>
                      </div>
                      <Progress 
                        value={item.percentage} 
                        className={`h-2 ${item.isOverBudget ? 'bg-red-100' : ''}`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.actualPercentage.toFixed(1)}% used</span>
                        {item.isOverBudget && (
                          <span className="text-red-600 font-medium">
                            {formatCurrency(item.overspent)} over budget
                          </span>
                        )}
                      </div>
                      {item.isOverBudget && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            Budget exceeded for {item.name} by {formatCurrency(item.overspent)}!
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
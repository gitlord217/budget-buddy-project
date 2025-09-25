import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Settings, Trash2 } from 'lucide-react';
import { Category } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';

interface AdvancedBudgetDialogProps {
  categories: Category[];
}

export const AdvancedBudgetDialog = ({ categories }: AdvancedBudgetDialogProps) => {
  const [open, setOpen] = useState(false);
  const [budgetAmounts, setBudgetAmounts] = useState<Record<string, string>>({});
  const [totalLimit, setTotalLimit] = useState('');
  const { budgets, profile, setBudgetLimit, setTotalExpenditureLimit, removeBudgetLimit, loading, refetch } = useBudgets();

  const handleSetCategoryBudget = async (categoryId: string) => {
    try {
      const amount = parseFloat(budgetAmounts[categoryId]);
      if (amount && amount > 0) {
        await setBudgetLimit(categoryId, amount);
        setBudgetAmounts(prev => ({ ...prev, [categoryId]: '' }));
        await refetch(); // Refetch budget data to update UI immediately
        window.dispatchEvent(new CustomEvent('budgets:changed'));
      }
    } catch (error) {
      console.error('Failed to set category budget:', error);
    }
  };

  const handleSetTotalLimit = async () => {
    try {
      const amount = parseFloat(totalLimit);
      if (amount && amount > 0) {
        await setTotalExpenditureLimit(amount);
        setTotalLimit('');
        await refetch(); // Refetch budget data to update UI immediately
        window.dispatchEvent(new CustomEvent('budgets:changed'));
      }
    } catch (error) {
      console.error('Failed to set total limit:', error);
    }
  };

  const handleRemoveTotalLimit = async () => {
    await setTotalExpenditureLimit(null);
    await refetch(); // Refetch budget data to update UI immediately
    window.dispatchEvent(new CustomEvent('budgets:changed'));
  };

  const getCategoryBudget = (categoryId: string) => {
    return budgets.find(b => b.category_id === categoryId);
  };

  // Filter and deduplicate expense categories by name to avoid duplicates
  const expenseCategories = categories
    .filter(c => c.type === 'expense' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(c.id))
    .reduce((unique, category) => {
      const isDuplicate = unique.some(c => c.name === category.name);
      if (!isDuplicate) {
        unique.push(category);
      }
      return unique;
    }, [] as Category[]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Advanced Budget Management
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Budget Management</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Total Expenditure Limit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Total Expenditure Limit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="total-limit">Daily Total Limit (₹)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="total-limit"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter total daily limit"
                      value={totalLimit}
                      onChange={(e) => setTotalLimit(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSetTotalLimit} 
                      disabled={!totalLimit || parseFloat(totalLimit) <= 0 || loading}
                    >
                      Set Limit
                    </Button>
                  </div>
                </div>
              </div>
              
              {profile?.total_expenditure_limit && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Current Daily Total Limit</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(profile.total_expenditure_limit)}
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleRemoveTotalLimit}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Category Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Category Spending Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {expenseCategories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No expense categories available. Create some expense categories first.
                  </p>
                ) : (
                  expenseCategories.map((category) => {
                    const existingBudget = getCategoryBudget(category.id);
                    
                    return (
                      <div key={category.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex items-center gap-2 flex-1">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-1">
                          {existingBudget ? (
                            <div className="flex items-center justify-between w-full">
                              <div>
                                <p className="text-sm text-muted-foreground">Current Daily Limit</p>
                                <p className="font-bold text-primary">
                                  {formatCurrency(existingBudget.amount)}
                                </p>
                              </div>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={async () => {
                                  await removeBudgetLimit(category.id);
                                  await refetch();
                                  window.dispatchEvent(new CustomEvent('budgets:changed'));
                                }}
                                disabled={loading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Amount (₹)"
                                value={budgetAmounts[category.id] || ''}
                                onChange={(e) => setBudgetAmounts(prev => ({ 
                                  ...prev, 
                                  [category.id]: e.target.value 
                                }))}
                                className="flex-1"
                              />
                              <Button 
                                onClick={() => handleSetCategoryBudget(category.id)}
                                disabled={!budgetAmounts[category.id] || parseFloat(budgetAmounts[category.id]) <= 0 || loading}
                              >
                                Set Limit
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted rounded-lg">
                <p className="font-medium mb-1">Note:</p>
                <p>Categories without limits have no spending restrictions. Set daily limits to track and control spending for specific categories. Limits reset each day.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
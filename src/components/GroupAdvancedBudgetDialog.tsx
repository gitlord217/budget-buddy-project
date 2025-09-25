import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { Category } from '@/hooks/useTransactions';
import { useGroupBudgets } from '@/hooks/useGroupBudgets';
import { formatCurrency } from '@/lib/currency';

interface GroupAdvancedBudgetDialogProps {
  groupId: string;
  categories: Category[];
  children?: React.ReactNode;
}

export const GroupAdvancedBudgetDialog = ({ groupId, categories, children }: GroupAdvancedBudgetDialogProps) => {
  const [open, setOpen] = useState(false);
  const [categoryAmounts, setCategoryAmounts] = useState<{ [key: string]: string }>({});
  const [totalLimit, setTotalLimit] = useState('');
  
  const { 
    budgets, 
    groupInfo, 
    setBudgetLimit, 
    setTotalExpenditureLimit, 
    removeBudgetLimit,
    removeTotalExpenditureLimit,
    refetch
  } = useGroupBudgets(groupId, categories);

  // Filter categories to only include expense categories and include categories from all group members
  const allExpenseCategories = categories.filter(cat => cat.type === 'expense');
  // Group by name and pick one representative category per name
  const uniqueExpenseCategories = allExpenseCategories.reduce((acc, cat) => {
    if (!acc.find(c => c.name === cat.name)) {
      acc.push(cat);
    }
    return acc;
  }, [] as Category[]);

  const handleSetCategoryBudget = async (categoryName: string, categoryColor: string) => {
    const amount = parseFloat(categoryAmounts[categoryName]);
    if (!isNaN(amount) && amount > 0) {
      await setBudgetLimit(categoryName, categoryColor, amount);
      setCategoryAmounts({ ...categoryAmounts, [categoryName]: '' });
      await refetch();
      window.dispatchEvent(new CustomEvent(`groupBudgets:changed:${groupId}`));
    }
  };

  const handleSetTotalLimit = async () => {
    const amount = parseFloat(totalLimit);
    if (!isNaN(amount) && amount > 0) {
      await setTotalExpenditureLimit(amount);
      setTotalLimit('');
      await refetch(); // Refetch budget data to update UI immediately
      window.dispatchEvent(new CustomEvent(`groupBudgets:changed:${groupId}`));
    }
  };

  const handleRemoveTotalLimit = async () => {
    await removeTotalExpenditureLimit();
    await refetch(); // Refetch budget data to update UI immediately
    window.dispatchEvent(new CustomEvent(`groupBudgets:changed:${groupId}`));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Manage Group Budgets
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Group Daily Budget Limits</DialogTitle>
          <DialogDescription>
            Set daily spending limits for your group. These limits apply to all group members combined and reset each day.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Total Group Expenditure Limit */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Total Daily Group Expenditure Limit</Label>
              <p className="text-sm text-muted-foreground">
                Set a daily spending limit for the entire group across all categories.
              </p>
            </div>
            
            {groupInfo?.total_expenditure_limit ? (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Current limit: {formatCurrency(groupInfo.total_expenditure_limit)}/day</p>
                  <p className="text-sm text-muted-foreground">Active for all group spending</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRemoveTotalLimit}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter daily limit amount"
                  value={totalLimit}
                  onChange={(e) => setTotalLimit(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSetTotalLimit} disabled={!totalLimit}>
                  Set Limit
                </Button>
              </div>
            )}
          </div>

          {/* Category Budget Limits */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Category Budget Limits</Label>
              <p className="text-sm text-muted-foreground">
                Set daily spending limits for specific expense categories.
              </p>
            </div>
            
            <div className="space-y-3">
              {uniqueExpenseCategories.map((category) => {
                // Find existing budget by category name
                const existingBudget = budgets.find(b => 
                  b.category_name === category.name && 
                  b.period === 'daily'
                );
                
                return (
                  <div key={category.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    
                    {existingBudget ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(existingBudget.amount)}/day
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            await removeBudgetLimit(category.name);
                            await refetch();
                            window.dispatchEvent(new CustomEvent(`groupBudgets:changed:${groupId}`));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={categoryAmounts[category.name] || ''}
                          onChange={(e) => setCategoryAmounts({
                            ...categoryAmounts,
                            [category.name]: e.target.value
                          })}
                          className="w-24"
                        />
                        <Button 
                          size="sm"
                          onClick={() => handleSetCategoryBudget(category.name, category.color)}
                          disabled={!categoryAmounts[category.name]}
                        >
                          Set
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Note:</strong> Group budget limits are daily limits that apply to all group members combined. 
              These limits reset every day at midnight and any group member can view or modify them.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
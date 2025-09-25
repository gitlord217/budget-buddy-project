import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Category } from '@/hooks/useTransactions';

interface AddTransactionDialogProps {
  categories: Category[];
  onAdd: (data: {
    amount: number;
    description: string;
    type: 'income' | 'expense';
    date: string;
    category_id: string | null;
  }) => Promise<void> | void;
  children?: React.ReactNode;
}

export const AddTransactionDialog = ({ categories, onAdd, children }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());

  // Filter and de-duplicate categories by name within the selected type
  const filteredCategories = categories.filter(cat => cat.type === type);
  const filteredUniqueCategories = Array.from(
    new Map(filteredCategories.map(c => [c.name + '|' + c.type, c])).values()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description) return;

    await onAdd({
      amount: parseFloat(amount),
      description,
      type,
      date: format(date, 'yyyy-MM-dd'),
      category_id: categoryId || null
    });

    // Reset form
    setAmount('');
    setDescription('');
    setCategoryId('');
    setDate(new Date());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4 pr-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(value: 'income' | 'expense') => {
                setType(value);
                setCategoryId(''); // Reset category when type changes
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter transaction description"
                required
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Category ({filteredUniqueCategories.length} available)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={filteredUniqueCategories.length > 0 ? "Select category" : "No categories available"} />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  {filteredUniqueCategories.length > 0 ? (
                    filteredUniqueCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-categories" disabled>
                      No categories found for {type}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => selectedDate && setDate(selectedDate)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-2 pt-4 sticky bottom-0 bg-background pb-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Transaction
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
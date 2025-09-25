import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Transaction } from '@/hooks/useTransactions';
import { TrendingUp, TrendingDown, Calendar, DollarSign, FileText, Tag, User } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface ViewTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ViewTransactionDialog = ({ transaction, open, onOpenChange }: ViewTransactionDialogProps) => {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {transaction.type === 'income' ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            Transaction Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Amount */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className={`text-2xl font-bold ${
                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(Number(transaction.amount)))}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{transaction.description}</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{format(new Date(transaction.date), 'EEEE, MMMM dd, yyyy')}</p>
            </div>
          </div>

          {/* Category */}
          <div className="flex items-center gap-3">
            <Tag className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Category</p>
              {transaction.categories ? (
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: transaction.categories.color }}
                  />
                  <Badge variant="secondary">
                    {transaction.categories.name}
                  </Badge>
                </div>
              ) : (
                <p className="text-muted-foreground">No category</p>
              )}
            </div>
          </div>

          {/* Member (for group transactions) */}
          {transaction.group_id && (
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Added by</p>
                <p className="font-medium text-blue-600">
                  {transaction.profiles?.full_name || transaction.profiles?.username || 'Unknown Member'}
                </p>
              </div>
            </div>
          )}

          {/* Transaction Type */}
          <div className="flex items-center gap-3">
            {transaction.type === 'income' ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                {transaction.type === 'income' ? 'Income' : 'Expense'}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
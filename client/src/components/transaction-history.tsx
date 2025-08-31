import { type Payment } from '@shared/schema';

interface TransactionHistoryProps {
  transactions: Payment[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const getTransactionIcon = (command: string) => {
    switch (command) {
      case 'unlock':
        return 'fas fa-unlock text-green-600';
      case 'lock':
        return 'fas fa-lock text-blue-600';
      case 'on':
      case 'off':
        return 'fas fa-power-off text-blue-600';
      default:
        return 'fas fa-microchip text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Less than an hour ago';
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-card-foreground" data-testid="text-transaction-history-title">
          Recent Transactions
        </h3>
        <button className="text-sm text-primary hover:text-primary/80 font-medium" data-testid="button-view-all-transactions">
          View All <i className="fas fa-arrow-right ml-1"></i>
        </button>
      </div>

      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center py-8" data-testid="no-transactions">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-history text-xl text-muted-foreground"></i>
            </div>
            <p className="text-muted-foreground" data-testid="text-no-transactions">
              No transactions yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Make a payment to see your transaction history
            </p>
          </div>
        ) : (
          transactions.slice(0, 5).map((tx, index) => (
            <div key={tx.id} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`transaction-${index}`}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <i className={`${getTransactionIcon(tx.command)} text-xs`}></i>
                </div>
                <div>
                  <p className="font-medium text-sm text-card-foreground" data-testid={`text-transaction-action-${index}`}>
                    {tx.command.charAt(0).toUpperCase() + tx.command.slice(1)} Device
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-transaction-time-${index}`}>
                    {formatTimeAgo(tx.createdAt)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-sm text-card-foreground" data-testid={`text-transaction-amount-${index}`}>
                  -{tx.amount} {tx.currency}
                </p>
                <p className={`text-xs ${getStatusColor(tx.status)}`} data-testid={`text-transaction-status-${index}`}>
                  {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

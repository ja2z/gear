import { formatTimestamp } from '../utils/dateFormatting';

const TransactionCard = ({ transaction, showItemId = false }) => {
  return (
    <div 
      className={`border rounded-lg p-4 bg-white ${
        transaction.action === 'Check out' 
          ? 'border-blue-300 shadow-sm' 
          : 'border-green-300 shadow-sm'
      }`}
    >
      {/* Action Badge and Timestamp */}
      <div className="flex items-center justify-between mb-3">
        <span 
          className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold text-white ${
            transaction.action === 'Check out'
              ? 'bg-scout-blue'
              : 'bg-scout-green'
          }`}
        >
          {transaction.action}
        </span>
        <span className="text-xs text-gray-600">
          {formatTimestamp(transaction.timestamp)}
        </span>
      </div>
      
      {/* Transaction Details */}
      <div className="space-y-2 text-sm">
        {showItemId && transaction.itemId && (
          <div className="flex">
            <span className="font-medium text-gray-700 w-32">Item ID:</span>
            <span className="text-gray-900">{transaction.itemId}</span>
          </div>
        )}
        
        {transaction.outingName && (
          <div className="flex">
            <span className="font-medium text-gray-700 w-32">Outing:</span>
            <span className="text-gray-900">{transaction.outingName}</span>
          </div>
        )}
        
        {transaction.action === 'Check out' && transaction.checkedOutTo && (
          <div className="flex">
            <span className="font-medium text-gray-700 w-32">Checked Out To:</span>
            <span className="text-gray-900">{transaction.checkedOutTo}</span>
          </div>
        )}
        
        {transaction.condition && (
          <div className="flex">
            <span className="font-medium text-gray-700 w-32">Condition:</span>
            <span className="text-gray-900">{transaction.condition}</span>
          </div>
        )}
        
        {transaction.processedBy && (
          <div className="flex">
            <span className="font-medium text-gray-700 w-32">Processed By:</span>
            <span className="text-gray-900">{transaction.processedBy}</span>
          </div>
        )}
        
        {transaction.notes && (
          <div className="flex">
            <span className="font-medium text-gray-700 w-32">Notes:</span>
            <span className="text-gray-900">{transaction.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionCard;


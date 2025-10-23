import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useInventory } from '../../hooks/useInventory';
import { formatTimestamp } from '../../utils/dateFormatting';

const ItemTransactionLog = () => {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const { toast, showToast, hideToast } = useToast();
  const { getData } = useInventory();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [itemId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getData(`/manage-inventory/items/${itemId}/transactions`);
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showToast('Failed to load transaction log', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Header */}
      <div className="header">
        <Link
          to={`/manage-inventory/edit-item/${itemId}`}
          className="back-button no-underline"
        >
          ←
        </Link>
        <h1>Transaction Log</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Content */}
      <div className="px-5 py-6">
        {/* Item ID Display */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{itemId}</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-scout-blue"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500 text-lg">No transactions found for this item</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction, index) => (
              <div 
                key={index}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemTransactionLog;


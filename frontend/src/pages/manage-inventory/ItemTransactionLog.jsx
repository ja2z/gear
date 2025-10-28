import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Toast from '../../components/Toast';
import TransactionCard from '../../components/TransactionCard';
import { useToast } from '../../hooks/useToast';
import { useInventory } from '../../hooks/useInventory';

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
    <div className="h-screen-small flex flex-col bg-gray-100">
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

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
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
              <TransactionCard 
                key={index} 
                transaction={transaction} 
                showItemId={false}
              />
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ItemTransactionLog;


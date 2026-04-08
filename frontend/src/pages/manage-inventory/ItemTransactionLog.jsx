import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Toast from '../../components/Toast';
import TransactionCard from '../../components/TransactionCard';
import { useToast } from '../../hooks/useToast';
import { useInventory } from '../../hooks/useInventory';
import { AnimateMain } from '../../components/AnimateMain';
import HeaderProfileMenu from '../../components/HeaderProfileMenu';
import useIsDesktop from '../../hooks/useIsDesktop';
import { useDesktopHeader } from '../../context/DesktopHeaderContext';

const ItemTransactionLog = () => {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const { toast, showToast, hideToast } = useToast();
  const { getData } = useInventory();
  const isDesktop = useIsDesktop();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useDesktopHeader({ title: 'Transaction Log', subtitle: itemId });

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
    <div className={isDesktop ? '' : 'h-screen-small flex flex-col bg-gray-100'}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {!isDesktop && (
        <div className="header">
          <Link
            to="/manage-inventory/view"
            state={{ editItemId: itemId }}
            className="back-button no-underline"
            aria-label="Back to manage items"
          >
            ←
          </Link>
          <h1>Transaction Log</h1>
          <HeaderProfileMenu />
        </div>
      )}

      <AnimateMain className={isDesktop ? '' : 'flex flex-1 flex-col min-h-0'}>
      <div className={isDesktop ? '' : 'flex-1 overflow-y-auto'}>
        <div className={isDesktop ? 'py-5' : 'px-5 py-6'}>
        {!isDesktop && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{itemId}</h2>
          </div>
        )}

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
      </AnimateMain>
    </div>
  );
};

export default ItemTransactionLog;

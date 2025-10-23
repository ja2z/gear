// Disable browser's automatic scroll restoration
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Categories from './pages/Categories';
import Items from './pages/Items';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Checkin from './pages/Checkin';
import CheckinForm from './pages/CheckinForm';
import OutingSelection from './pages/OutingSelection';
import Success from './pages/Success';
import ScrollToTop from './components/ScrollToTop';
import { CartProvider } from './context/CartContext';
import { SyncProvider } from './context/SyncContext';
// Manage Inventory imports
import ManageInventoryDashboard from './pages/manage-inventory/ManageInventoryDashboard';
import ViewInventory from './pages/manage-inventory/ViewInventory';
import AddItem from './pages/manage-inventory/AddItem';
import EditItem from './pages/manage-inventory/EditItem';
import DeleteItem from './pages/manage-inventory/DeleteItem';
import SelectCategory from './pages/manage-inventory/SelectCategory';
import ManageCategories from './pages/manage-inventory/ManageCategories';
import AddCategory from './pages/manage-inventory/AddCategory';
import EditCategory from './pages/manage-inventory/EditCategory';
import ItemTransactionLog from './pages/manage-inventory/ItemTransactionLog';

function App() {
  return (
    <SyncProvider>
      <CartProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/items/:category" element={<Items />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkin/outings" element={<OutingSelection />} />
              <Route path="/checkin/items" element={<Checkin />} />
              <Route path="/checkin/form" element={<CheckinForm />} />
              <Route path="/checkin" element={<Checkin />} />
              <Route path="/success" element={<Success />} />
              {/* Manage Inventory routes */}
              <Route path="/manage-inventory" element={<ManageInventoryDashboard />} />
              <Route path="/manage-inventory/view" element={<ViewInventory />} />
              <Route path="/manage-inventory/add-item" element={<AddItem />} />
              <Route path="/manage-inventory/edit-item/:itemId" element={<EditItem />} />
              <Route path="/manage-inventory/item-log/:itemId" element={<ItemTransactionLog />} />
              <Route path="/manage-inventory/delete-item/:itemId" element={<DeleteItem />} />
              <Route path="/manage-inventory/select-category" element={<SelectCategory />} />
              <Route path="/manage-inventory/categories" element={<ManageCategories />} />
              <Route path="/manage-inventory/add-category" element={<AddCategory />} />
              <Route path="/manage-inventory/edit-category/:classCode" element={<EditCategory />} />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </SyncProvider>
  );
}

export default App

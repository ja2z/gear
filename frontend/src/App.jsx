// Disable browser's automatic scroll restoration
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Context providers
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { setUnauthorizedHandler } from './hooks/useInventory';

// Shared components
import ScrollToTop from './components/ScrollToTop';
import InputFocusLock from './components/InputFocusLock';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages (public)
import LoginPage from './pages/LoginPage';
import VerifyPage from './pages/VerifyPage';

// App pages
import HomePage from './pages/HomePage';
import Landing from './pages/Landing';
import ManagePage from './pages/ManagePage';
import OutingsPage from './pages/OutingsPage';

// Existing pages
import Categories from './pages/Categories';
import Items from './pages/Items';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Checkin from './pages/Checkin';
import CheckinForm from './pages/CheckinForm';
import OutingSelection from './pages/OutingSelection';
import Success from './pages/Success';
import CheckoutOptions from './pages/CheckoutOptions';
import ReservationInfo from './pages/ReservationInfo';
import ReservationSuccess from './pages/ReservationSuccess';
import Reservations from './pages/Reservations';

// Manage Inventory
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
import ViewTransactionLog from './pages/manage-inventory/ViewTransactionLog';

// Shown at '/': spinner while loading, redirect to /home if authed, else LoginPage
function SmartRoot() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-scout-blue" />
      </div>
    );
  }
  if (user) return <Navigate to="/home" replace />;
  return <LoginPage />;
}

// Wires the module-level 401 handler to the auth context's logout.
// Must be inside AuthProvider so useAuth() works.
function UnauthorizedWatcher() {
  const { logout } = useAuth();
  useEffect(() => {
    setUnauthorizedHandler(() => logout());
    return () => setUnauthorizedHandler(null);
  }, [logout]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <UnauthorizedWatcher />
          <ScrollToTop />
          <InputFocusLock />
          <div className="min-h-screen xl:bg-gray-200">
            <div className="xl:max-w-2xl xl:mx-auto bg-gray-50 min-h-screen xl:shadow-xl">
              <Routes>
                {/* Public routes */}
                <Route path="/"            element={<SmartRoot />} />
                <Route path="/auth/verify" element={<VerifyPage />} />

                {/* Authenticated hub */}
                <Route path="/home" element={
                  <ProtectedRoute><HomePage /></ProtectedRoute>
                } />

                {/* Top-level sections */}
                <Route path="/gear" element={
                  <ProtectedRoute><Landing /></ProtectedRoute>
                } />
                <Route path="/outings" element={
                  <ProtectedRoute><OutingsPage /></ProtectedRoute>
                } />
                <Route path="/manage" element={
                  <ProtectedRoute><ManagePage /></ProtectedRoute>
                } />

                {/* Gear sub-routes */}
                <Route path="/categories" element={
                  <ProtectedRoute><Categories /></ProtectedRoute>
                } />
                <Route path="/items/:category" element={
                  <ProtectedRoute><Items /></ProtectedRoute>
                } />
                <Route path="/cart" element={
                  <ProtectedRoute><Cart /></ProtectedRoute>
                } />
                <Route path="/checkout" element={
                  <ProtectedRoute><Checkout /></ProtectedRoute>
                } />
                <Route path="/checkin/outings" element={<Navigate to="/checkin" replace />} />
                <Route path="/checkin/items"   element={<Navigate to="/checkin" replace />} />
                <Route path="/checkin/form" element={
                  <ProtectedRoute><CheckinForm /></ProtectedRoute>
                } />
                <Route path="/checkin" element={
                  <ProtectedRoute><Checkin /></ProtectedRoute>
                } />
                <Route path="/success" element={
                  <ProtectedRoute><Success /></ProtectedRoute>
                } />
                <Route path="/checkout-options" element={
                  <ProtectedRoute><CheckoutOptions /></ProtectedRoute>
                } />
                <Route path="/reservations" element={
                  <ProtectedRoute><Reservations /></ProtectedRoute>
                } />
                <Route path="/reservation-info" element={
                  <ProtectedRoute><ReservationInfo /></ProtectedRoute>
                } />
                <Route path="/reservation-success" element={
                  <ProtectedRoute><ReservationSuccess /></ProtectedRoute>
                } />
                <Route path="/outing-selection" element={
                  <ProtectedRoute><OutingSelection /></ProtectedRoute>
                } />

                {/* Manage Inventory */}
                <Route path="/manage-inventory" element={
                  <ProtectedRoute><ManageInventoryDashboard /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/view" element={
                  <ProtectedRoute><ViewInventory /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/add-item" element={
                  <ProtectedRoute><AddItem /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/edit-item/:itemId" element={
                  <ProtectedRoute><EditItem /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/item-log/:itemId" element={
                  <ProtectedRoute><ItemTransactionLog /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/view-logs" element={
                  <ProtectedRoute><ViewTransactionLog /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/delete-item/:itemId" element={
                  <ProtectedRoute><DeleteItem /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/select-category" element={
                  <ProtectedRoute><SelectCategory /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/categories" element={
                  <ProtectedRoute><ManageCategories /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/add-category" element={
                  <ProtectedRoute><AddCategory /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/edit-category/:classCode" element={
                  <ProtectedRoute><EditCategory /></ProtectedRoute>
                } />
              </Routes>
            </div>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;

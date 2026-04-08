// Disable browser's automatic scroll restoration
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

import { HashRouter as Router, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Context providers
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isDevAuthBypassActive } from './config/devAuthBypass';
import { setUnauthorizedHandler } from './hooks/useInventory';
import { MembersMockProvider } from './context/MembersMockContext';

// Shared components
import ScrollToTop from './components/ScrollToTop';
import InputFocusLock from './components/InputFocusLock';
import ProtectedRoute from './components/ProtectedRoute';
import { canCheckout, canCheckin, canManageInventory, canManageMembers } from './utils/permissions';

// Auth pages (public)
import LoginPage from './pages/LoginPage';
import VerifyPage from './pages/VerifyPage';

// App pages
import HomePage from './pages/HomePage';
import Landing from './pages/Landing';
import ManageTables from './pages/ManageTables';
import OutingsPage from './pages/OutingsPage';
import ComingSoonPage from './pages/ComingSoonPage';

// Members (mock roster — session-only)
import ManageMembers from './pages/manage-members/ManageMembers';
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
function NavigateAddItemModal() {
  return <Navigate to="/manage-inventory/view" replace state={{ openAddItem: true }} />;
}

function NavigateEditItemModal() {
  const { itemId } = useParams();
  return <Navigate to="/manage-inventory/view" replace state={{ editItemId: itemId }} />;
}

function NavigateDeleteItemModal() {
  const { itemId } = useParams();
  return <Navigate to="/manage-inventory/view" replace state={{ deleteItemId: itemId }} />;
}

function UnauthorizedWatcher() {
  const { logout } = useAuth();
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (isDevAuthBypassActive()) return;
      logout();
    });
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
                <Route path="/advancement" element={
                  <ProtectedRoute><ComingSoonPage title="Advancement" /></ProtectedRoute>
                } />
                <Route path="/calendar" element={
                  <ProtectedRoute><ComingSoonPage title="Calendar" /></ProtectedRoute>
                } />
                {/* Manage hub + members (shared mock roster context) */}
                <Route
                  path="/manage"
                  element={
                    <ProtectedRoute>
                      <MembersMockProvider>
                        <Outlet />
                      </MembersMockProvider>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<ManageTables />} />
                  {/* Legacy URLs → roster list */}
                  <Route
                    path="members/roster"
                    element={<Navigate to="/manage/members" replace />}
                  />
                  <Route
                    path="members/add"
                    element={
                      <Navigate to="/manage/members" replace state={{ openAddMember: true }} />
                    }
                  />
                  <Route path="members" element={
                    <ProtectedRoute canAccess={canManageMembers}><ManageMembers /></ProtectedRoute>
                  } />
                </Route>

                {/* Gear sub-routes */}
                <Route path="/categories" element={
                  <ProtectedRoute canAccess={canCheckout}><Categories /></ProtectedRoute>
                } />
                <Route path="/items/:category" element={
                  <ProtectedRoute canAccess={canCheckout}><Items /></ProtectedRoute>
                } />
                <Route path="/cart" element={
                  <ProtectedRoute canAccess={canCheckout}><Cart /></ProtectedRoute>
                } />
                <Route path="/checkout" element={
                  <ProtectedRoute canAccess={canCheckout}><Checkout /></ProtectedRoute>
                } />
                <Route path="/checkin/outings" element={<Navigate to="/checkin" replace />} />
                <Route path="/checkin/items"   element={<Navigate to="/checkin" replace />} />
                <Route path="/checkin/form" element={
                  <ProtectedRoute canAccess={canCheckin}><CheckinForm /></ProtectedRoute>
                } />
                <Route path="/checkin" element={
                  <ProtectedRoute canAccess={canCheckin}><Checkin /></ProtectedRoute>
                } />
                <Route path="/success" element={
                  <ProtectedRoute canAccess={canCheckout}><Success /></ProtectedRoute>
                } />
                <Route path="/checkout-options" element={
                  <ProtectedRoute canAccess={canCheckout}><CheckoutOptions /></ProtectedRoute>
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
                  <ProtectedRoute canAccess={canCheckout}><OutingSelection /></ProtectedRoute>
                } />

                {/* Manage Inventory */}
                <Route path="/manage-inventory" element={
                  <ProtectedRoute canAccess={canManageInventory}><ManageInventoryDashboard /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/view" element={
                  <ProtectedRoute canAccess={canManageInventory}><ViewInventory /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/add-item" element={
                  <ProtectedRoute canAccess={canManageInventory}><NavigateAddItemModal /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/edit-item/:itemId" element={
                  <ProtectedRoute canAccess={canManageInventory}><NavigateEditItemModal /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/item-log/:itemId" element={
                  <ProtectedRoute canAccess={canManageInventory}><ItemTransactionLog /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/view-logs" element={
                  <ProtectedRoute canAccess={canManageInventory}><ViewTransactionLog /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/delete-item/:itemId" element={
                  <ProtectedRoute canAccess={canManageInventory}><NavigateDeleteItemModal /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/select-category" element={
                  <ProtectedRoute canAccess={canManageInventory}><SelectCategory /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/categories" element={
                  <ProtectedRoute canAccess={canManageInventory}><ManageCategories /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/add-category" element={
                  <ProtectedRoute canAccess={canManageInventory}><AddCategory /></ProtectedRoute>
                } />
                <Route path="/manage-inventory/edit-category/:classCode" element={
                  <ProtectedRoute canAccess={canManageInventory}><EditCategory /></ProtectedRoute>
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

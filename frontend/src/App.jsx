// Disable browser's automatic scroll restoration
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

import { HashRouter as Router, Routes, Route, Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import useIsDesktop from './hooks/useIsDesktop';

// Context providers
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { setUnauthorizedHandler } from './hooks/useInventory';
import { MembersMockProvider } from './context/MembersMockContext';

// Shared components
import ScrollToTop from './components/ScrollToTop';
import InputFocusLock from './components/InputFocusLock';
import ProtectedRoute from './components/ProtectedRoute';
import DesktopLayoutRoute from './components/DesktopLayoutRoute';
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
import CalendarPage from './pages/CalendarPage';
import HubEventPlaceholder from './pages/HubEventPlaceholder';

// Members (mock roster — session-only)
import ManageMembers from './pages/manage-members/ManageMembers';
// Existing pages
import Categories from './pages/Categories';
import Items from './pages/Items';
import Cart from './pages/Cart';
import Checkin from './pages/Checkin';
import OutingSelection from './pages/OutingSelection';
import Success from './pages/Success';
import CheckoutOptions from './pages/CheckoutOptions';
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
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);
  return null;
}

/**
 * Outer chrome — on lg+ everything is full-width (DesktopShell manages width).
 * Below lg, hub pages are full-width; other routes get a centered column on xl.
 */
const FULL_WIDTH_MOBILE = new Set([
  '/home',
  '/gear',
  '/events',
  '/outings',
  '/manage',
  '/advancement',
  '/calendar',
]);

function AppContentShell() {
  const { pathname } = useLocation();
  const isDesktop = useIsDesktop();

  const isFullWidthMobile = FULL_WIDTH_MOBILE.has(pathname);
  const innerClass = isDesktop || isFullWidthMobile
    ? 'w-full min-h-screen bg-gray-50'
    : 'min-h-screen bg-gray-50 xl:mx-auto xl:max-w-2xl xl:shadow-xl';
  const outerClass = isDesktop
    ? 'min-h-screen bg-gray-50'
    : 'min-h-screen xl:bg-gray-200';

  return (
    <div className={outerClass}>
      <div className={innerClass}>
        <Routes>
                {/* Public routes — no desktop shell */}
                <Route path="/"            element={<SmartRoot />} />
                <Route path="/auth/verify" element={<VerifyPage />} />

                {/* All authenticated routes share the desktop layout */}
                <Route element={<ProtectedRoute><DesktopLayoutRoute /></ProtectedRoute>}>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/hub/event/:eventId" element={<HubEventPlaceholder />} />

                  <Route path="/gear" element={<Landing />} />
                  <Route path="/events" element={<OutingsPage />} />
                  <Route path="/outings" element={<Navigate to="/events" replace />} />
                  <Route path="/advancement" element={<ComingSoonPage title="Advancement" />} />
                  <Route path="/calendar" element={<CalendarPage />} />

                  {/* Manage hub + members */}
                  <Route
                    path="/manage"
                    element={<MembersMockProvider><Outlet /></MembersMockProvider>}
                  >
                    <Route index element={<ManageTables />} />
                    <Route path="members/roster" element={<Navigate to="/manage/members" replace />} />
                    <Route path="members/add" element={<Navigate to="/manage/members" replace state={{ openAddMember: true }} />} />
                    <Route
                      path="members"
                      element={(
                        <ProtectedRoute canAccess={canManageMembers}>
                          <ManageMembers />
                        </ProtectedRoute>
                      )}
                    />
                  </Route>

                  {/* Gear sub-routes */}
                  <Route path="/checkout/select-event" element={<Navigate to="/categories" replace />} />
                  <Route path="/categories" element={<ProtectedRoute canAccess={canCheckout}><Categories /></ProtectedRoute>} />
                  <Route path="/items/:category" element={<ProtectedRoute canAccess={canCheckout}><Items /></ProtectedRoute>} />
                  <Route path="/cart" element={<ProtectedRoute canAccess={canCheckout}><Cart /></ProtectedRoute>} />
                  <Route path="/checkout" element={<Navigate to="/cart" replace />} />
                  <Route path="/checkin/outings" element={<Navigate to="/checkin" replace />} />
                  <Route path="/checkin/items"   element={<Navigate to="/checkin" replace />} />
                  <Route path="/checkin/form" element={<Navigate to="/checkin" replace />} />
                  <Route path="/checkin" element={<ProtectedRoute canAccess={canCheckin}><Checkin /></ProtectedRoute>} />
                  <Route path="/success" element={<ProtectedRoute canAccess={canCheckout}><Success /></ProtectedRoute>} />
                  <Route path="/checkout-options" element={<ProtectedRoute canAccess={canCheckout}><CheckoutOptions /></ProtectedRoute>} />
                  <Route path="/reservations" element={<Reservations />} />
                  <Route path="/reservation-success" element={<ReservationSuccess />} />
                  <Route path="/outing-selection" element={<ProtectedRoute canAccess={canCheckout}><OutingSelection /></ProtectedRoute>} />

                  {/* Manage Inventory */}
                  <Route path="/manage-inventory" element={<ProtectedRoute canAccess={canManageInventory}><ManageInventoryDashboard /></ProtectedRoute>} />
                  <Route path="/manage-inventory/view" element={<ProtectedRoute canAccess={canManageInventory}><ViewInventory /></ProtectedRoute>} />
                  <Route path="/manage-inventory/add-item" element={<ProtectedRoute canAccess={canManageInventory}><NavigateAddItemModal /></ProtectedRoute>} />
                  <Route path="/manage-inventory/edit-item/:itemId" element={<ProtectedRoute canAccess={canManageInventory}><NavigateEditItemModal /></ProtectedRoute>} />
                  <Route path="/manage-inventory/item-log/:itemId" element={<ProtectedRoute canAccess={canManageInventory}><ItemTransactionLog /></ProtectedRoute>} />
                  <Route path="/manage-inventory/view-logs" element={<ProtectedRoute canAccess={canManageInventory}><ViewTransactionLog /></ProtectedRoute>} />
                  <Route path="/manage-inventory/delete-item/:itemId" element={<ProtectedRoute canAccess={canManageInventory}><NavigateDeleteItemModal /></ProtectedRoute>} />
                  <Route path="/manage-inventory/select-category" element={<ProtectedRoute canAccess={canManageInventory}><SelectCategory /></ProtectedRoute>} />
                  <Route path="/manage-inventory/categories" element={<ProtectedRoute canAccess={canManageInventory}><ManageCategories /></ProtectedRoute>} />
                  <Route path="/manage-inventory/add-category" element={<ProtectedRoute canAccess={canManageInventory}><AddCategory /></ProtectedRoute>} />
                  <Route path="/manage-inventory/edit-category/:classCode" element={<ProtectedRoute canAccess={canManageInventory}><EditCategory /></ProtectedRoute>} />
                </Route>
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <UnauthorizedWatcher />
          <ScrollToTop />
          <InputFocusLock />
          <AppContentShell />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;

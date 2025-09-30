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
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </SyncProvider>
  );
}

export default App

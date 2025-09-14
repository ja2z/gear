import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Categories from './pages/Categories';
import Items from './pages/Items';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Checkin from './pages/Checkin';
import OutingSelection from './pages/OutingSelection';
import Success from './pages/Success';
import { CartProvider } from './context/CartContext';

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/items/:category" element={<Items />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkin/outings" element={<OutingSelection />} />
            <Route path="/checkin/items" element={<Checkin />} />
            <Route path="/checkin" element={<Checkin />} />
            <Route path="/success" element={<Success />} />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App

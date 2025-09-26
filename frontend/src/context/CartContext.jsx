import { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext();

// localStorage key for cart persistence
const CART_STORAGE_KEY = 'scout_gear_cart';

// 72 hours in milliseconds
const CART_EXPIRATION_MS = 72 * 60 * 60 * 1000;

// Helper functions for localStorage operations
const saveCartToStorage = (cartData) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
  } catch (error) {
    console.warn('Failed to save cart to localStorage:', error);
  }
};

const loadCartFromStorage = () => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return null;
    
    const cartData = JSON.parse(stored);
    
    // Check if cart has expired
    if (cartData.createdAt && Date.now() - cartData.createdAt > CART_EXPIRATION_MS) {
      // Cart has expired, clear it
      localStorage.removeItem(CART_STORAGE_KEY);
      return null;
    }
    
    return cartData;
  } catch (error) {
    console.warn('Failed to load cart from localStorage:', error);
    // Clear corrupted data
    localStorage.removeItem(CART_STORAGE_KEY);
    return null;
  }
};

const clearCartFromStorage = () => {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear cart from localStorage:', error);
  }
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM':
      // Check if item already exists in cart
      const existingItem = state.items.find(item => item.itemId === action.payload.itemId);
      if (existingItem) {
        return state; // Don't add duplicates
      }
      
      const newState = {
        ...state,
        items: [...state.items, action.payload],
        // Set createdAt when first item is added to empty cart
        createdAt: state.items.length === 0 ? Date.now() : state.createdAt
      };
      
      // Save to localStorage
      saveCartToStorage(newState);
      return newState;
    
    case 'REMOVE_ITEM':
      const updatedState = {
        ...state,
        items: state.items.filter(item => item.itemId !== action.payload)
      };
      
      // If cart becomes empty, clear createdAt
      if (updatedState.items.length === 0) {
        updatedState.createdAt = null;
      }
      
      // Save to localStorage
      saveCartToStorage(updatedState);
      return updatedState;
    
    case 'ADD_MULTIPLE_ITEMS':
      // Add multiple items at once (for multi-select)
      const newItems = action.payload.filter(newItem => 
        !state.items.find(existingItem => existingItem.itemId === newItem.itemId)
      );
      
      const multiState = {
        ...state,
        items: [...state.items, ...newItems],
        // Set createdAt when first items are added to empty cart
        createdAt: state.items.length === 0 ? Date.now() : state.createdAt
      };
      
      // Save to localStorage
      saveCartToStorage(multiState);
      return multiState;
    
    case 'CLEAR_CART':
      const clearedState = {
        ...state,
        items: [],
        createdAt: null
      };
      
      // Clear from localStorage
      clearCartFromStorage();
      return clearedState;
    
    case 'LOAD_CART':
      // Load cart from localStorage (used on app initialization)
      return action.payload;
    
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    createdAt: null
  });

  // Initialize cart from localStorage on app startup
  useEffect(() => {
    const savedCart = loadCartFromStorage();
    if (savedCart) {
      dispatch({ type: 'LOAD_CART', payload: savedCart });
    }
  }, []);

  const addItem = (item) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const addMultipleItems = (items) => {
    dispatch({ type: 'ADD_MULTIPLE_ITEMS', payload: items });
  };

  const removeItem = (itemId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getTotalItems = () => {
    return state.items.length;
  };

  const isItemInCart = (itemId) => {
    return state.items.some(item => item.itemId === itemId);
  };

  // Helper function to get cart age in hours (for debugging/display)
  const getCartAge = () => {
    if (!state.createdAt) return null;
    return Math.floor((Date.now() - state.createdAt) / (1000 * 60 * 60));
  };

  // Helper function to check if cart is expired
  const isCartExpired = () => {
    if (!state.createdAt) return false;
    return Date.now() - state.createdAt > CART_EXPIRATION_MS;
  };

  const value = {
    items: state.items,
    addItem,
    addMultipleItems,
    removeItem,
    clearCart,
    getTotalItems,
    isItemInCart,
    getCartAge,
    isCartExpired
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

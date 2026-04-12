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
    case 'SET_RESERVATION_META':
      const metaState = { ...state, reservationMeta: action.payload };
      saveCartToStorage(metaState);
      return metaState;

    /** Shallow-merge into reservationMeta without dropping other fields (e.g. eventType backfill). */
    case 'MERGE_RESERVATION_META':
      if (!state.reservationMeta) return state;
      const mergedMetaState = {
        ...state,
        reservationMeta: { ...state.reservationMeta, ...action.payload },
      };
      saveCartToStorage(mergedMetaState);
      return mergedMetaState;

    /** Single write: clear cart items and set reservation draft (avoids clear + set races with localStorage). */
    case 'BEGIN_RESERVE_CATEGORIES_DRAFT': {
      const draftState = {
        ...state,
        items: [],
        createdAt: null,
        checkoutEvent: null,
        reservationMeta: action.payload,
      };
      saveCartToStorage(draftState);
      return draftState;
    }

    /** Replace cart items + reservation meta in one save (edit / checkout-from-reservation flows). */
    case 'SET_CART_RESERVATION_SESSION': {
      const { items: sessionItems, meta } = action.payload;
      const list = Array.isArray(sessionItems) ? sessionItems : [];
      const sessionState = {
        ...state,
        items: list,
        createdAt: list.length ? Date.now() : null,
        checkoutEvent: null,
        reservationMeta: meta,
      };
      saveCartToStorage(sessionState);
      return sessionState;
    }

    case 'SET_CHECKOUT_EVENT':
      const evState = { ...state, checkoutEvent: action.payload };
      saveCartToStorage(evState);
      return evState;

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
        updatedState.checkoutEvent = null;
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
        createdAt: null,
        reservationMeta: null,
        checkoutEvent: null,
      };
      
      // Clear from localStorage
      clearCartFromStorage();
      return clearedState;
    
    case 'LOAD_CART': {
      const p = action.payload;
      return {
        items: p.items || [],
        createdAt: p.createdAt ?? null,
        reservationMeta: p.reservationMeta ?? null,
        checkoutEvent: p.checkoutEvent ?? null,
      };
    }
    
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    createdAt: null,
    reservationMeta: null,
    /** { eventId, outingName, scoutName? } — chosen before browsing gear (checkout flow only) */
    checkoutEvent: null,
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

  const setReservationMeta = (meta) => {
    dispatch({ type: 'SET_RESERVATION_META', payload: meta });
  };

  const mergeReservationMeta = (partial) => {
    dispatch({ type: 'MERGE_RESERVATION_META', payload: partial });
  };

  const beginReserveCategoriesDraft = (meta) => {
    dispatch({ type: 'BEGIN_RESERVE_CATEGORIES_DRAFT', payload: meta });
  };

  const setCartReservationSession = ({ items: sessionItems, meta }) => {
    dispatch({ type: 'SET_CART_RESERVATION_SESSION', payload: { items: sessionItems, meta } });
  };

  const setCheckoutEvent = (payload) => {
    dispatch({ type: 'SET_CHECKOUT_EVENT', payload });
  };

  const getTotalItems = () => {
    return state.items.length;
  };

  const isItemInCart = (itemId) => {
    return state.items.some(item => item.itemId === itemId);
  };

  const getItemsInCartByCategory = (categoryName) => {
    return state.items.filter(item => item.itemClass === categoryName).length;
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
    reservationMeta: state.reservationMeta,
    checkoutEvent: state.checkoutEvent,
    addItem,
    addMultipleItems,
    removeItem,
    clearCart,
    setReservationMeta,
    mergeReservationMeta,
    beginReserveCategoriesDraft,
    setCartReservationSession,
    setCheckoutEvent,
    getTotalItems,
    isItemInCart,
    getItemsInCartByCategory,
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

import { createContext, useContext, useReducer } from 'react';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM':
      // Check if item already exists in cart
      const existingItem = state.items.find(item => item.itemId === action.payload.itemId);
      if (existingItem) {
        return state; // Don't add duplicates
      }
      return {
        ...state,
        items: [...state.items, action.payload]
      };
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.itemId !== action.payload)
      };
    
    case 'ADD_MULTIPLE_ITEMS':
      // Add multiple items at once (for multi-select)
      const newItems = action.payload.filter(newItem => 
        !state.items.find(existingItem => existingItem.itemId === newItem.itemId)
      );
      return {
        ...state,
        items: [...state.items, ...newItems]
      };
    
    case 'CLEAR_CART':
      return {
        ...state,
        items: []
      };
    
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: []
  });

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

  const value = {
    items: state.items,
    addItem,
    addMultipleItems,
    removeItem,
    clearCart,
    getTotalItems
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

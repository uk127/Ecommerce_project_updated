import { createReducer } from "@reduxjs/toolkit";

// Helper to validate cart items
const validateCartItems = (items) => {
  if (!Array.isArray(items)) return [];
  
  return items.filter((item) => {
    // Only keep items that have valid required fields
    return item && 
           item._id && 
           item.name && 
           item.name !== 'Unknown Product' &&
           Number(item.discountPrice) > 0;
  });
};

// Get and validate cart from localStorage
const getValidatedCartFromStorage = () => {
  try {
    const stored = localStorage.getItem("cartItems");
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return validateCartItems(parsed);
  } catch (e) {
    console.error("Error parsing cart from localStorage:", e);
    localStorage.removeItem("cartItems");
    return [];
  }
};

const initialState = {
  cart: getValidatedCartFromStorage(),
  loading: false,
  error: null,
};

export const cartReducer = createReducer(initialState, {
  // Add to cart or update quantity
  addToCart: (state, action) => {
    const item = action.payload;
    const isItemExist = state.cart.find((i) => i._id === item._id);

    if (isItemExist) {
      // Update the item with new data (including potentially new quantity)
      return {
        ...state,
        cart: state.cart.map((i) =>
          i._id === item._id ? { ...i, ...item } : i
        ),
      };
    } else {
      // Add new item
      return {
        ...state,
        cart: [...state.cart, item],
      };
    }
  },

  // Remove from cart
  removeFromCart: (state, action) => {
    return {
      ...state,
      cart: state.cart.filter((i) => i._id !== action.payload),
    };
  },

  // Update cart quantity
  updateCartQuantity: (state, action) => {
    const { productId, quantity } = action.payload;

    if (quantity <= 0) {
      return {
        ...state,
        cart: state.cart.filter((i) => i._id !== productId),
      };
    }

    return {
      ...state,
      cart: state.cart.map((i) =>
        i._id === productId ? { ...i, qty: quantity } : i
      ),
    };
  },

  // Set entire cart (used when fetching from backend or merging)
  setCart: (state, action) => {
    return {
      ...state,
      cart: action.payload,
    };
  },

  // Clear cart
  clearCart: (state) => {
    return {
      ...state,
      cart: [],
    };
  },

  // Loading states
  cartLoadingStart: (state) => {
    state.loading = true;
  },
  cartLoadingEnd: (state) => {
    state.loading = false;
  },

  // Error handling
  cartError: (state, action) => {
    state.error = action.payload;
    state.loading = false;
  },

  // Clear errors
  clearCartErrors: (state) => {
    state.error = null;
  },
});
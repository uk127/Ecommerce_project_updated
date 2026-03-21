import axios from "axios";
import { server } from "../../server";

// Helper to save cart to localStorage
const saveCartToLocalStorage = (cart) => {
  if (cart && Array.isArray(cart)) {
    localStorage.setItem("cartItems", JSON.stringify(cart));
  } else {
    localStorage.setItem("cartItems", JSON.stringify([]));
  }
};

// Helper to get cart from localStorage
export const getCartFromLocalStorage = () => {
  try {
    const cart = localStorage.getItem("cartItems");
    if (cart) {
      const parsed = JSON.parse(cart);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (e) {
    console.error("Error parsing cart from localStorage:", e);
    return [];
  }
};

// Helper to clear cart from localStorage
const clearCartFromLocalStorage = () => {
  localStorage.removeItem("cartItems");
};

// Helper to transform backend cart to frontend format
const transformBackendCart = (backendCart) => {
  if (!backendCart || !backendCart.items || !Array.isArray(backendCart.items)) return [];

  return backendCart.items
    .filter((item) => item && item.productId) // Filter out items with null productId
    .map((item) => {
      // Handle both populated and unpopulated productId
      const product = item.productId;
      const productData = typeof product === 'object' ? product : { _id: product };
      
      return {
        _id: productData._id || item.productId,
        name: productData.name || 'Unknown Product',
        discountPrice: productData.discountPrice || 0,
        originalPrice: productData.originalPrice || 0,
        qty: item.quantity || 1,
        stock: productData.stock || 999,
        images: productData.images || [],
        shop: productData.shop || null,
        shopId: productData.shopId || null,
      };
    })
    .filter((item) => item._id && item.name !== 'Unknown Product'); // Filter out invalid items
};

// ==================== ADD TO CART ====================

/**
 * Add item to cart
 * Works for both logged-in and guest users
 */
export const addTocart = (data) => async (dispatch, getState) => {
  const { user } = getState();
  const isAuthenticated = user?.isAuthenticated;

  if (isAuthenticated) {
    // Logged-in user: call backend API
    try {
      const response = await axios.post(
        `${server}/cart/add`,
        {
          productId: data._id,
          quantity: data.qty || 1,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        const transformedCart = transformBackendCart(response.data.cart);
        dispatch({
          type: "setCart",
          payload: transformedCart,
        });
        saveCartToLocalStorage(transformedCart);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      // Fallback to local cart on error
      dispatch({
        type: "addToCart",
        payload: data,
      });
      const { cart } = getState().cart;
      saveCartToLocalStorage(cart);
    }
  } else {
    // Guest user: use localStorage
    dispatch({
      type: "addToCart",
      payload: data,
    });

    // Get updated cart and save to localStorage
    const updatedState = getState();
    const updatedCart = updatedState.cart?.cart || [];
    saveCartToLocalStorage(updatedCart);
  }

  return data;
};

// ==================== REMOVE FROM CART ====================

/**
 * Remove item from cart
 * Works for both logged-in and guest users
 */
export const removeFromCart = (data) => async (dispatch, getState) => {
  const { user } = getState();
  const isAuthenticated = user?.isAuthenticated;
  const productId = data._id || data;

  if (isAuthenticated) {
    // Logged-in user: call backend API
    try {
      const response = await axios.delete(`${server}/cart/remove/${productId}`, {
        withCredentials: true,
      });

      if (response.data.success) {
        const transformedCart = transformBackendCart(response.data.cart);
        dispatch({
          type: "setCart",
          payload: transformedCart,
        });
        saveCartToLocalStorage(transformedCart);
      }
    } catch (error) {
      console.error("Error removing from cart:", error);
      // Fallback to local removal
      dispatch({
        type: "removeFromCart",
        payload: productId,
      });
      const { cart } = getState().cart;
      saveCartToLocalStorage(cart);
    }
  } else {
    // Guest user: use localStorage
    dispatch({
      type: "removeFromCart",
      payload: productId,
    });

    const { cart } = getState().cart;
    saveCartToLocalStorage(cart);
  }

  return data;
};

// ==================== UPDATE CART QUANTITY ====================

/**
 * Update item quantity in cart
 * Works for both logged-in and guest users
 */
export const updateCartQuantity = (productId, quantity) => async (dispatch, getState) => {
  const { user } = getState();
  const isAuthenticated = user?.isAuthenticated;

  if (isAuthenticated) {
    // Logged-in user: call backend API
    try {
      const response = await axios.put(
        `${server}/cart/update`,
        {
          productId,
          quantity,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        const transformedCart = transformBackendCart(response.data.cart);
        dispatch({
          type: "setCart",
          payload: transformedCart,
        });
        saveCartToLocalStorage(transformedCart);
      }
    } catch (error) {
      console.error("Error updating cart quantity:", error);
      // Fallback to local update
      dispatch({
        type: "updateCartQuantity",
        payload: { productId, quantity },
      });
      const { cart } = getState().cart;
      saveCartToLocalStorage(cart);
    }
  } else {
    // Guest user: use localStorage
    dispatch({
      type: "updateCartQuantity",
      payload: { productId, quantity },
    });

    const { cart } = getState().cart;
    saveCartToLocalStorage(cart);
  }
};

// ==================== FETCH CART (FOR LOGGED-IN USERS) ====================

/**
 * Fetch cart from backend for logged-in users
 * This clears localStorage and uses only database cart
 */
export const fetchCart = () => async (dispatch) => {
  try {
    // Clear any existing local cart data
    clearCartFromLocalStorage();
    dispatch({ type: "clearCart" });

    const response = await axios.get(`${server}/cart`, {
      withCredentials: true,
    });

    if (response.data.success) {
      const transformedCart = transformBackendCart(response.data.cart);
      dispatch({
        type: "setCart",
        payload: transformedCart,
      });
      saveCartToLocalStorage(transformedCart);
      console.log("Cart fetched from backend:", transformedCart);
    }
  } catch (error) {
    console.error("Error fetching cart:", error);
  }
};

// ==================== MERGE CART (ON LOGIN) ====================

/**
 * Merge local cart with backend cart after login
 * Should be called after successful login
 */
export const mergeCartAfterLogin = () => async (dispatch, getState) => {
  const localCart = getCartFromLocalStorage();

  // Always fetch cart from backend first to see what's there
  try {
    const response = await axios.get(`${server}/cart`, {
      withCredentials: true,
    });

    if (response.data.success) {
      const backendCartItems = response.data.cart?.items || [];
      
      // If no local cart and no backend cart, just clear everything
      if (localCart.length === 0 && backendCartItems.length === 0) {
        clearCartFromLocalStorage();
        dispatch({ type: "clearCart" });
        return;
      }

      // If no local cart but backend has items, use backend cart
      if (localCart.length === 0 && backendCartItems.length > 0) {
        const transformedCart = transformBackendCart(response.data.cart);
        dispatch({ type: "setCart", payload: transformedCart });
        saveCartToLocalStorage(transformedCart);
        return;
      }

      // If local cart exists, merge with backend
      const items = localCart
        .filter((item) => item._id && item.name && item.name !== 'Unknown Product')
        .map((item) => ({
          productId: item._id,
          quantity: item.qty,
        }));

      if (items.length === 0) {
        // All local items were invalid, just use backend cart
        const transformedCart = transformBackendCart(response.data.cart);
        dispatch({ type: "setCart", payload: transformedCart });
        saveCartToLocalStorage(transformedCart);
        return;
      }

      const mergeResponse = await axios.post(
        `${server}/cart/merge`,
        { items },
        { withCredentials: true }
      );

      if (mergeResponse.data.success) {
        const transformedCart = transformBackendCart(mergeResponse.data.cart);
        dispatch({ type: "setCart", payload: transformedCart });
        clearCartFromLocalStorage();
        saveCartToLocalStorage(transformedCart);
      }
    }
  } catch (error) {
    console.error("Error merging cart:", error);
    // On error, just fetch whatever is in backend
    dispatch(fetchCart());
  }
};

// ==================== CLEAR CART ====================

/**
 * Clear entire cart
 */
export const clearCart = () => async (dispatch, getState) => {
  const { user } = getState();
  const isAuthenticated = user?.isAuthenticated;

  if (isAuthenticated) {
    try {
      await axios.delete(`${server}/cart/clear`, {
        withCredentials: true,
      });
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  }

  dispatch({
    type: "clearCart",
  });

  clearCartFromLocalStorage();
};

// ==================== RESET CART (CLEAR LOCALSTORAGE) ====================

/**
 * Reset cart - clears localStorage and Redux state
 * Use this when cart data is corrupted
 */
export const resetCart = () => (dispatch) => {
  clearCartFromLocalStorage();
  dispatch({ type: "clearCart" });
  console.log("Cart has been reset");
};
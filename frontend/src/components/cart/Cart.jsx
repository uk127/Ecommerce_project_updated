import React, { useEffect, useCallback, useRef } from "react";
import { RxCross1 } from "react-icons/rx";
import styles from "../../styles/styles";
import { Link } from "react-router-dom";
import { IoBagHandleOutline } from "react-icons/io5";
import { HiOutlineMinus, HiPlus } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getImageUrl } from "../../server";
import { removeFromCart, updateCartQuantity } from "../../redux/actions/cart";

const Cart = ({ setOpenCart }) => {
  const cartState = useSelector((state) => state.cart);
  const cart = cartState?.cart || [];
  const dispatch = useDispatch();

  // Debug: Log cart data to console
  useEffect(() => {
    console.log("Cart state:", cartState);
    console.log("Cart items:", cart);
    // Also check localStorage directly
    const localCart = localStorage.getItem("cartItems");
    console.log("LocalStorage cart:", localCart ? JSON.parse(localCart) : []);
  }, [cart, cartState]);

  // Remove from cart
  const removeFromCartHandler = (data) => {
    dispatch(removeFromCart(data));
  };

  // Calculate total price safely
  const totalPrice = cart && cart.length > 0
    ? cart.reduce((acc, item) => {
        const price = Number(item?.discountPrice) || 0;
        const qty = Number(item?.qty) || 0;
        return acc + (price * qty);
      }, 0)
    : 0;

  // Quantity change handler - uses updateCartQuantity to SET the quantity
  const updateQuantityHandler = useCallback((productId, newQuantity) => {
    dispatch(updateCartQuantity(productId, newQuantity));
  }, [dispatch]);

  return (
    <div className="fixed top-0 left-0 w-full bg-[#0000004b] h-screen z-10">
      <div className="fixed top-0 right-0 h-full w-[80%] 800px:w-[25%] bg-white flex flex-col overflow-y-scroll justify-between shadow-sm">
        {!cart || cart.length === 0 ? (
          <div className="w-full h-screen flex items-center justify-center">
            <div className="flex w-full justify-end pt-5 pr-5 fixed top-3 right-3">
              <RxCross1
                size={25}
                className="cursor-pointer"
                onClick={() => setOpenCart(false)}
              />
            </div>
            <h5>Cart is empty!</h5>
          </div>
        ) : (
          <>
            <div>
              <div className="flex w-full justify-end pt-5 pr-5 ">
                <RxCross1
                  size={25}
                  className="cursor-pointer"
                  onClick={() => setOpenCart(false)}
                />
              </div>
              {/* item length */}
              <div className={`${styles.noramlFlex} p-4`}>
                <IoBagHandleOutline size={25} />
                <h5 className="pl-2 text-[20px] font-[500]">
                  {cart.length} items
                </h5>
              </div>

              {/* Cart Single item */}
              <br />
              <div className="w-full border-t">
                {cart.map((item, index) => (
                  <CartSingle
                    data={item}
                    key={item._id || index}
                    updateQuantityHandler={updateQuantityHandler}
                    removeFromCartHandler={removeFromCartHandler}
                  />
                ))}
              </div>
            </div>

            <div className="px-5 mb-3">
              {/* Check out btn */}
              <Link to="/checkout">
                <div
                  className={`h-[45px] flex items-center justify-center w-[100%] bg-[#e44343] rounded-[5px]`}
                >
                  <h1 className="text-[#fff] text-[18px] font-[600]">
                    Checkout Now (₹{totalPrice.toFixed(2)})
                  </h1>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const CartSingle = ({ data, updateQuantityHandler, removeFromCartHandler }) => {
  // Ensure we have valid values with proper fallbacks
  const _id = data?._id || "";
  const name = data?.name || "Unknown Product";
  const qty = Number(data?.qty) || 1;
  const discountPrice = Number(data?.discountPrice) || 0;
  const stock = Number(data?.stock) || 999;
  const images = data?.images || [];
  const totalPrice = discountPrice * qty;

  // Track if we're currently updating to prevent double-clicks
  const isUpdating = useRef(false);

  // Increment quantity
  const increment = () => {
    if (isUpdating.current) return; // Prevent double-clicks
    
    if (qty >= stock) {
      toast.error("Product stock limited!");
      return;
    }
    
    isUpdating.current = true;
    updateQuantityHandler(_id, qty + 1);
    
    // Reset updating flag after a short delay
    setTimeout(() => {
      isUpdating.current = false;
    }, 300);
  };

  // Decrement quantity
  const decrement = () => {
    if (isUpdating.current) return; // Prevent double-clicks
    
    if (qty <= 1) {
      // Remove item if quantity would be 0
      removeFromCartHandler(data);
      return;
    }
    
    isUpdating.current = true;
    updateQuantityHandler(_id, qty - 1);
    
    // Reset updating flag after a short delay
    setTimeout(() => {
      isUpdating.current = false;
    }, 300);
  };

  return (
    <div className="border-b p-4">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Quantity controls */}
        <div className="flex flex-col items-center gap-1">
          <div
            className={`bg-[#e44343] border border-[#e4434373] rounded-full w-[25px] h-[25px] ${styles.noramlFlex} justify-center cursor-pointer`}
            onClick={increment}
          >
            <HiPlus size={18} color="#fff" />
          </div>
          <span className="text-[16px] font-[500]">{qty}</span>
          <div
            className="bg-[#a7abb14f] rounded-full w-[25px] h-[25px] flex items-center justify-center cursor-pointer"
            onClick={decrement}
          >
            <HiOutlineMinus size={16} color="#7d879c" />
          </div>
        </div>

        {/* Product image */}
        <img
          src={getImageUrl(images && images.length > 0 ? images[0] : null)}
          className="w-[80px] h-[80px] object-cover rounded-[5px]"
          alt={name}
          onError={(e) => {
            e.target.src = "/placeholder-image.png";
          }}
        />

        {/* Product details */}
        <div className="flex-1 pl-[10px]">
          <h1 className="font-[500] text-[14px] text-[#000000] line-clamp-1">
            {name}
          </h1>
          <h4 className="font-[400] text-[13px] text-[#00000082] mt-1">
            ₹{discountPrice} × {qty}
          </h4>
          <h4 className="font-[600] text-[15px] pt-[3px] text-[#d02222]">
            ₹{totalPrice.toFixed(2)}
          </h4>
        </div>

        {/* Remove button */}
        <RxCross1
          size={20}
          color="#7d879c"
          className="cursor-pointer shrink-0 hover:text-[#e44343]"
          onClick={() => removeFromCartHandler(data)}
        />
      </div>
    </div>
  );
};

export default Cart;
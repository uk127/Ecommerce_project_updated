import React, { useState, useRef, useEffect, useCallback } from "react";
import { AiOutlineClose, AiOutlineSend, AiOutlineShoppingCart } from "react-icons/ai";
import { HiOutlineMicrophone } from "react-icons/hi";
import { BsChatDots, BsStar, BsCheckCircle, BsXCircle } from "react-icons/bs";
import { IoMdTrendingUp } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { server, getImageUrl } from "../../server";
import { addTocart, removeFromCart } from "../../redux/actions/cart";

const AIAssistant = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cart } = useSelector((state) => state.cart);
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI Shopkeeper. I can help you find products, check prices, manage your cart, and more. How can I help you today?",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser");
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      
      setTimeout(() => {
        if (transcript.trim()) {
          sendMessage(transcript.trim());
        }
      }, 500);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Text-to-Speech function
  const speakText = useCallback((text) => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (voice) => voice.name.includes("Google") || voice.name.includes("Samantha") || voice.lang === "en-US"
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  // Add product to Redux cart
  const addToReduxCart = useCallback((productData) => {
    // Check if product already in cart
    const existingItem = cart.find((item) => item._id === productData._id);
    
    const cartItem = {
      _id: productData._id,
      name: productData.name,
      discountPrice: productData.discountPrice,
      originalPrice: productData.originalPrice,
      qty: existingItem ? existingItem.qty + (productData.quantity || 1) : (productData.quantity || 1),
      stock: productData.stock,
      images: productData.images,
      shop: productData.shop,
      shopId: productData.shopId,
    };

    dispatch(addTocart(cartItem));
    toast.success(`${productData.name} added to cart!`);
  }, [dispatch, cart]);

  // Remove product from Redux cart by ID
  const removeFromReduxCartById = useCallback((productId) => {
    const item = cart.find((item) => item._id === productId);
    if (item) {
      dispatch(removeFromCart(item));
      toast.success(`${item.name} removed from cart!`);
      return true;
    }
    return false;
  }, [dispatch, cart]);

  // Remove product from Redux cart by name (fuzzy match)
  const removeFromReduxCartByName = useCallback((productName) => {
    if (!productName || !cart || cart.length === 0) {
      return { success: false, name: productName };
    }

    // Try exact match first
    let item = cart.find((item) => item.name && item.name.toLowerCase() === productName.toLowerCase());

    // Try partial match
    if (!item) {
      item = cart.find((item) => item.name && item.name.toLowerCase().includes(productName.toLowerCase()));
    }

    // Try if product name contains cart item name
    if (!item) {
      item = cart.find((item) => item.name && productName.toLowerCase().includes(item.name.toLowerCase()));
    }

    if (item) {
      dispatch(removeFromCart(item));
      toast.success(`${item.name} removed from cart!`);
      return { success: true, name: item.name, productId: item._id };
    }
    return { success: false, name: productName };
  }, [dispatch, cart]);

  // Send message function
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: text.trim(),
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${server}/ai-assistant/chat`, {
        message: text.trim(),
      });

      if (response.data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          text: response.data.message,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          intent: response.data.intent,
          data: response.data.data,
        };

        // Handle cart operations with Redux
        if (response.data.intent === "AddToCart" && response.data.data?.products) {
          // Products are returned from backend with full details
          response.data.data.products.forEach((product) => {
            if (product._id) {
              addToReduxCart(product);
            }
          });
        }

        // Handle AutoSearch - navigate to search results page
        if (response.data.intent === "AutoSearch" && response.data.data?.navigateTo) {
          setTimeout(() => {
            navigate(response.data.data.navigateTo);
            setIsOpen(false);
          }, 1500); // Small delay to let user see the message
        }

        if (response.data.intent === "RemoveFromCart" && response.data.data?.removed) {
          // Handle removal from Redux/localStorage cart
          const removalResults = [];
          response.data.data.removed.forEach((item) => {
            // Use the name-based removal which searches in Redux cart
            const result = removeFromReduxCartByName(item.productName);
            removalResults.push(result);
          });
          
          // Update the message based on actual removal results
          const successRemovals = removalResults.filter(r => r.success);
          const failedRemovals = removalResults.filter(r => !r.success);
          
          if (successRemovals.length > 0 && failedRemovals.length === 0) {
            // All successful - update message with success
            const removedNames = successRemovals.map(r => r.name).join(", ");
            aiMessage.text = `Successfully removed "${removedNames}" from your cart!`;
          } else if (successRemovals.length > 0 && failedRemovals.length > 0) {
            // Partial success
            const removedNames = successRemovals.map(r => r.name).join(", ");
            const notFoundNames = failedRemovals.map(r => r.name).join(", ");
            aiMessage.text = `Removed "${removedNames}" from your cart. However, I couldn't find "${notFoundNames}" in your cart.`;
          } else if (failedRemovals.length > 0) {
            // All failed - update message to reflect item not in cart
            const notFoundNames = failedRemovals.map(r => r.name).join(", ");
            aiMessage.text = `I couldn't find "${notFoundNames}" in your cart. Would you like me to show you what's in your cart?`;
          }
        }

        // Add message to chat and speak (after any modifications above)
        setMessages((prev) => [...prev, aiMessage]);
        speakText(aiMessage.text);
      } else {
        throw new Error("Failed to get response");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      const errorResponse = {
        id: Date.now() + 1,
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }, [speakText, addToReduxCart, removeFromReduxCartByName]);

  const handleSendMessage = () => {
    if (inputValue.trim() === "" || isLoading) return;
    sendMessage(inputValue);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceInput = () => {
    if (!voiceSupported || !recognitionRef.current) {
      alert("Speech recognition is not supported in your browser. Please try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }
    }
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Render product card
  const renderProductCard = (product, index) => (
    <div
      key={index}
      className="bg-orange-50 rounded-xl p-3 mb-2 border border-orange-100 hover:border-orange-300 transition-all"
    >
      <div className="flex gap-3">
        {product.images && product.images.length > 0 && (
          <img
            src={getImageUrl(product.images[0])}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-lg"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-800 text-sm truncate">{product.name}</h4>
          <p className="text-xs text-gray-500">{product.category}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-semibold text-orange-600">₹{product.discountPrice}</span>
            {product.originalPrice && product.originalPrice > product.discountPrice && (
              <span className="text-xs text-gray-400 line-through">₹{product.originalPrice}</span>
            )}
          </div>
          {product.ratings && (
            <div className="flex items-center gap-1 mt-1">
              <BsStar className="text-yellow-400 text-xs" />
              <span className="text-xs text-gray-600">{product.ratings.toFixed(1)}</span>
            </div>
          )}
          {product.stock !== undefined && (
            <div className={`flex items-center gap-1 mt-1 ${product.stock > 0 ? "text-green-600" : "text-red-500"}`}>
              {product.stock > 0 ? <BsCheckCircle className="text-xs" /> : <BsXCircle className="text-xs" />}
              <span className="text-xs">{product.stock > 0 ? `${product.stock} in stock` : "Out of Stock"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render cart item
  const renderCartItem = (item, index) => (
    <div
      key={index}
      className="bg-orange-50 rounded-xl p-3 mb-2 border border-orange-100"
    >
      <div className="flex gap-3">
        {item.images && item.images.length > 0 && (
          <img
            src={getImageUrl(item.images[0])}
            alt={item.name}
            className="w-16 h-16 object-cover rounded-lg"
          />
        )}
        <div className="flex-1">
          <h4 className="font-medium text-gray-800 text-sm">{item.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-600">Qty: {item.qty}</span>
            <span className="text-orange-600 font-semibold">₹{item.discountPrice * item.qty}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Render message data based on intent
  const renderMessageData = (message) => {
    if (!message.data) return null;

    switch (message.intent) {
      case "ShowCart":
        // Use actual cart from Redux
        const cartItems = cart || [];
        const cartTotal = cartItems.reduce((sum, item) => sum + (item.discountPrice * item.qty), 0);
        const itemCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
        
        return (
          <div className="mt-2">
            {cartItems.length === 0 ? (
              <p className="text-sm text-gray-500">Your cart is empty</p>
            ) : (
              <>
                {cartItems.map((item, i) => renderCartItem(item, i))}
                <div className="flex justify-between items-center bg-orange-100 rounded-lg p-2 mt-2">
                  <span className="font-medium text-gray-700">Total ({itemCount} items):</span>
                  <span className="font-bold text-orange-600">₹{cartTotal}</span>
                </div>
              </>
            )}
          </div>
        );

      case "RecommendProducts":
      case "SortByPrice":
      case "PopularProducts":
        return (
          <div className="mt-2 max-h-48 overflow-y-auto">
            {message.data.products?.map((product, i) => renderProductCard(product, i))}
          </div>
        );

      case "GetPrice":
        return (
          <div className="mt-2">
            {message.data.prices?.map((price, i) => (
              <div key={i} className="bg-orange-50 rounded-lg p-3 mb-2 border border-orange-100">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800">{price.productName}</span>
                  <span className="font-bold text-orange-600">₹{price.discountPrice}</span>
                </div>
                {price.discount > 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    {price.discount}% OFF (was ₹{price.originalPrice})
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case "CheckAvailability":
        return (
          <div className="mt-2">
            {message.data.availability?.map((item, i) => (
              <div key={i} className="bg-orange-50 rounded-lg p-3 mb-2 border border-orange-100">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800">{item.productName}</span>
                  <span className={`flex items-center gap-1 ${item.available ? "text-green-600" : "text-red-500"}`}>
                    {item.available ? <BsCheckCircle /> : <BsXCircle />}
                    {item.available ? `${item.stock} in stock` : "Out of stock"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );

      case "AddToCart":
        return (
          <div className="mt-2">
            {message.data.addedItems?.map((item, i) => (
              <div key={i} className="bg-green-50 rounded-lg p-2 mb-1 border border-green-200">
                <div className="flex items-center gap-2 text-green-700">
                  <AiOutlineShoppingCart />
                  <span className="text-sm">{item.productName} (Qty: {item.quantity}) - ₹{item.price}</span>
                </div>
              </div>
            ))}
          </div>
        );

      case "Payment":
        return (
          <div className="mt-2">
            {message.data.steps?.map((step, i) => (
              <div key={i} className="bg-orange-50 rounded-lg p-3 mb-2 border border-orange-100">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {step.step}
                  </span>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-800 text-sm">{step.title}</h5>
                    <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                    {step.fields && (
                      <ul className="mt-1 text-xs text-gray-500 list-disc list-inside">
                        {step.fields.map((field, idx) => (
                          <li key={idx}>{field}</li>
                        ))}
                      </ul>
                    )}
                    {step.options && (
                      <ul className="mt-1 text-xs text-gray-500 list-disc list-inside">
                        {step.options.map((option, idx) => (
                          <li key={idx}>{option}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case "RecipeIngredients":
        return (
          <div className="mt-2">
            {/* Recipe Name Header */}
            {message.data.recipeName && (
              <div className="bg-gradient-to-r from-orange-100 to-orange-50 rounded-lg p-2 mb-2 border border-orange-200">
                <p className="text-sm font-semibold text-orange-700">
                  🍳 {message.data.recipeName}
                </p>
              </div>
            )}
            
            {/* Available Products */}
            {message.data.availableProducts && message.data.availableProducts.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-green-600 font-medium mb-1">✅ Available in store:</p>
                {message.data.availableProducts.map((product, i) => (
                  <div key={i} className="bg-green-50 rounded-lg p-2 mb-1 border border-green-200">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {product.image && (
                          <img
                            src={getImageUrl(product.image)}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                          <p className="text-xs text-gray-500">₹{product.price}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          addToReduxCart({
                            _id: product.productId,
                            name: product.name,
                            discountPrice: product.price,
                            originalPrice: product.originalPrice,
                            stock: product.stock,
                            images: product.image ? [product.image] : [],
                            shop: product.shop,
                            shopId: product.shopId,
                            quantity: 1,
                          });
                        }}
                        className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                      >
                        <AiOutlineShoppingCart className="text-sm" />
                        Add
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Add All to Cart Button */}
                {message.data.availableProducts.length > 1 && (
                  <button
                    onClick={() => {
                      message.data.availableProducts.forEach((product) => {
                        addToReduxCart({
                          _id: product.productId,
                          name: product.name,
                          discountPrice: product.price,
                          originalPrice: product.originalPrice,
                          stock: product.stock,
                          images: product.image ? [product.image] : [],
                          shop: product.shop,
                          shopId: product.shopId,
                          quantity: 1,
                        });
                      });
                      toast.success(`Added all ${message.data.availableProducts.length} items to cart!`);
                    }}
                    className="w-full mt-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm py-2 rounded-lg transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
                  >
                    <AiOutlineShoppingCart />
                    Add All to Cart ({message.data.availableProducts.length} items)
                  </button>
                )}
              </div>
            )}
            
            {/* Not Available Items */}
            {message.data.notFound && message.data.notFound.length > 0 && (
              <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                <p className="text-xs text-red-600 font-medium">❌ Not available:</p>
                <p className="text-xs text-gray-600">{message.data.notFound.join(", ")}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Intent badge
  const getIntentBadge = (intent) => {
    if (!intent || intent === "Unknown") return null;
    
    const intentColors = {
      AddToCart: "bg-green-100 text-green-700",
      RemoveFromCart: "bg-red-100 text-red-700",
      ShowCart: "bg-blue-100 text-blue-700",
      GetPrice: "bg-purple-100 text-purple-700",
      CheckAvailability: "bg-yellow-100 text-yellow-700",
      RecommendProducts: "bg-pink-100 text-pink-700",
      SortByPrice: "bg-indigo-100 text-indigo-700",
      PopularProducts: "bg-orange-100 text-orange-700",
      AutoSearch: "bg-cyan-100 text-cyan-700",
      Payment: "bg-emerald-100 text-emerald-700",
      RecipeIngredients: "bg-amber-100 text-amber-700",
    };

    const intentIcons = {
      AddToCart: <AiOutlineShoppingCart className="text-xs" />,
      PopularProducts: <IoMdTrendingUp className="text-xs" />,
      RecipeIngredients: <span className="text-xs">🍳</span>,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${intentColors[intent] || "bg-gray-100 text-gray-700"}`}>
        {intentIcons[intent]}
        {intent}
      </span>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      <div
        className={`absolute bottom-16 right-0 w-[340px] sm:w-[400px] bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out origin-bottom-right ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        }`}
        style={{
          maxHeight: "580px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-400 to-orange-500 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm relative">
              <BsChatDots className="text-white text-xl" />
              {isSpeaking && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Anaachi AI</h3>
              <p className="text-white/80 text-xs">
                {isListening ? "🎤 Listening..." : isSpeaking ? "🔊 Speaking..." : isLoading ? "⏳ Thinking..." : "Powered by AI"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              stopSpeaking();
            }}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
            aria-label="Close chat"
          >
            <AiOutlineClose className="text-white text-lg" />
          </button>
        </div>

        {/* Messages Area */}
        <div
          className="h-[360px] overflow-y-auto px-4 py-4 bg-gradient-to-b from-orange-50/50 to-white"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#fdba74 #fff7ed" }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col mb-4 ${message.sender === "user" ? "items-end" : "items-start"}`}
            >
              {message.intent && getIntentBadge(message.intent) && (
                <div className="mb-1">{getIntentBadge(message.intent)}</div>
              )}
              <div
                className={`max-w-[90%] ${
                  message.sender === "user"
                    ? "bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-2xl rounded-br-md"
                    : "bg-white border border-orange-100 text-gray-700 rounded-2xl rounded-bl-md shadow-sm"
                } px-4 py-3`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    message.sender === "user" ? "text-white/70" : "text-gray-400"
                  }`}
                >
                  {message.timestamp}
                </p>
                {message.sender === "ai" && renderMessageData(message)}
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white border border-orange-100 text-gray-700 rounded-2xl rounded-bl-md shadow-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-4 py-3 bg-white border-t border-orange-100">
          <div className="flex items-center gap-2">
            {/* Voice Button */}
            <button
              onClick={handleVoiceInput}
              disabled={!voiceSupported || isLoading}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                !voiceSupported
                  ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                  : isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-orange-100 text-orange-500 hover:bg-orange-200"
              }`}
              aria-label="Voice input"
              title={voiceSupported ? "Click to speak" : "Voice not supported"}
            >
              <HiOutlineMicrophone className="text-xl" />
            </button>

            {/* Input Field */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? "Listening..." : isLoading ? "Processing..." : "Ask about products, prices, cart..."}
                disabled={isListening || isLoading}
                className={`w-full px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all ${
                  isListening || isLoading ? "opacity-70" : ""
                }`}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={inputValue.trim() === "" || isLoading || isListening}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                inputValue.trim() === "" || isLoading || isListening
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:shadow-lg hover:scale-105"
              }`}
              aria-label="Send message"
            >
              <AiOutlineSend className="text-lg" />
            </button>
          </div>
          
          {/* Status indicators */}
          {isListening && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <p className="text-xs text-red-500 font-medium">Listening... Speak now!</p>
            </div>
          )}
          
          {isSpeaking && !isListening && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-xs text-green-600 font-medium">AI is speaking...</p>
              <button onClick={stopSpeaking} className="text-xs text-gray-500 underline hover:text-gray-700">
                Stop
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) stopSpeaking();
        }}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 relative z-10 ${
          isOpen
            ? "bg-gray-600 hover:bg-gray-700"
            : "bg-gradient-to-r from-orange-400 to-orange-500 hover:shadow-xl hover:scale-110"
        }`}
        style={{
          boxShadow: isOpen
            ? "0 4px 15px rgba(0, 0, 0, 0.2)"
            : "0 8px 25px rgba(249, 115, 22, 0.4)",
        }}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <AiOutlineClose className="text-white text-2xl" />
        ) : (
          <BsChatDots className="text-white text-2xl" />
        )}
      </button>

      {/* Pulse animation when closed */}
      {!isOpen && (
        <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-20 pointer-events-none" />
      )}
    </div>
  );
};

export default AIAssistant;
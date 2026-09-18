import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  // Cart items saved in localStorage for persistent customer experience
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('ecommerce_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Payment Gateway Simulator Setting: 'RANDOM' | 'SUCCESS' | 'FAILURE' | 'TIMEOUT'
  const [simulatedGatewayMode, setSimulatedGatewayMode] = useState('RANDOM');

  useEffect(() => {
    try {
      localStorage.setItem('ecommerce_cart', JSON.stringify(cartItems));
    } catch (err) {
      console.error('Failed to persist cart:', err);
    }
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.product_id === product._id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          maxAvailable: product.available_quantity
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product_id: product._id,
            name: product.name,
            price: product.price,
            quantity: quantity,
            imageUrl: product.imageUrl,
            category: product.category,
            maxAvailable: product.available_quantity
          }
        ];
      }
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.product_id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        totalItemsCount,
        subtotal,
        isCartOpen,
        setIsCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        simulatedGatewayMode,
        setSimulatedGatewayMode
      }}
    >
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

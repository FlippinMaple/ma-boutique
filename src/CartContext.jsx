import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from './utils/api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // --- NEW: helpers pour éviter les faux abandoned pendant le checkout Stripe
  const setInCheckoutFlag = () => {
    try {
      localStorage.setItem(
        'inCheckout',
        JSON.stringify({
          ts: Date.now(),
          ttlMs: 20 * 60 * 1000 // 20 minutes
        })
      );
    } catch {
      // intentionally ignored
    }
  };

  const clearInCheckoutFlag = () => {
    try {
      localStorage.removeItem('inCheckout');
    } catch {
      // intentionally ignored
    }
  };

  const shouldSuppressAbandonedLog = () => {
    try {
      const raw = localStorage.getItem('inCheckout');
      if (!raw) return false;
      const { ts, ttlMs } = JSON.parse(raw);
      return Date.now() - ts <= (ttlMs || 0);
    } catch {
      return false;
    }
  };
  // --- FIN NEW

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    console.log('🧾 Panier mis à jour :', cart);
  }, [cart]);

  const addToCart = (item) => {
    const existingItem = cart.find((i) => i.id === item.id);

    const updatedCart = existingItem
      ? cart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        )
      : [...cart, item];

    setCart(updatedCart);
  };

  const validateStockBeforeAdd = async (item) => {
    try {
      const res = await api.get(
        `/api/inventory/printful-stock/${item.printful_variant_id}`
      );
      const data = res.data;
      const stockAvailable = data.available ?? 99;

      const existingItem = cart.find((i) => i.id === item.id);
      const totalQuantity = existingItem
        ? existingItem.quantity + item.quantity
        : item.quantity;

      if (totalQuantity > stockAvailable) {
        toast.error(
          `Désolé, il ne reste que ${stockAvailable} unités disponibles.`
        );
        return;
      }
      console.log('🛒 Ajout au panier:', item);
      addToCart(item);
      toast.success('Ajouté au panier ! 🛒', {
        duration: 1500,
        position: 'top-right',
        style: {
          background: '#e6fffa',
          color: '#1a202c'
        }
      });
    } catch (error) {
      console.error('Erreur de validation du stock:', error);
      toast.error('Erreur lors de la validation du stock.');
    }
  };

  const removeFromCart = (id) => {
    const updatedCart = cart.filter((item) => item.id !== id);
    setCart(updatedCart);
  };

  const updateQuantity = (id, quantity) => {
    setCart((prev) => {
      const q = Math.max(0, Number(quantity) || 0);
      if (q <= 0) return prev.filter((item) => item.id !== id); // 0 → supprime
      return prev.map((item) =>
        item.id === id ? { ...item, quantity: q } : item
      );
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        validateStockBeforeAdd,
        removeFromCart,
        updateQuantity,
        clearCart,
        // --- NEW: on expose les helpers
        setInCheckoutFlag,
        clearInCheckoutFlag,
        shouldSuppressAbandonedLog
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from './utils/api';

const MAX_QUANTITY_PER_LINE = 20;

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

  const addToCart = (item) => {
    const requestedQuantity = Number(item.quantity);
    if (
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity < 1 ||
      requestedQuantity > MAX_QUANTITY_PER_LINE
    ) {
      toast.error('La quantité doit être comprise entre 1 et 20.');
      return;
    }

    const existingItem = cart.find((i) => i.id === item.id);
    if (!existingItem) {
      setCart([...cart, { ...item, quantity: requestedQuantity }]);
      return;
    }

    const existingQuantity = Number(existingItem.quantity);
    const currentQuantity = Number.isInteger(existingQuantity)
      ? existingQuantity
      : 0;
    const totalQuantity = currentQuantity + requestedQuantity;
    if (totalQuantity > MAX_QUANTITY_PER_LINE) {
      toast.error('La quantité maximale est de 20 par article.');
      return;
    }

    setCart(
      cart.map((i) =>
        i.id === item.id ? { ...i, quantity: totalQuantity } : i
      )
    );
  };

  const validateStockBeforeAdd = async (item) => {
    const requestedQuantity = Number(item.quantity);
    if (
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity < 1 ||
      requestedQuantity > MAX_QUANTITY_PER_LINE
    ) {
      toast.error('La quantité doit être comprise entre 1 et 20.');
      return;
    }

    try {
      const res = await api.get(
        `/inventory/printful-stock/${item.printful_variant_id}`
      );

      if (res.data.available !== true) {
        toast.error('Ce produit est actuellement indisponible.');
        return;
      }

      const existingItem = cart.find((i) => i.id === item.id);
      const existingQuantity = Number(existingItem?.quantity);
      const currentQuantity = Number.isInteger(existingQuantity)
        ? existingQuantity
        : 0;
      const totalQuantity = currentQuantity + requestedQuantity;

      if (totalQuantity > MAX_QUANTITY_PER_LINE) {
        toast.error('La quantité maximale est de 20 par article.');
        return;
      }
      addToCart({
        ...item,
        quantity: requestedQuantity
      });
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
    const q = Number(quantity);
    if (q <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    if (!Number.isInteger(q)) {
      return;
    }
    if (q > MAX_QUANTITY_PER_LINE) {
      toast.error('La quantité maximale est de 20 par article.');
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: q } : item))
    );
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

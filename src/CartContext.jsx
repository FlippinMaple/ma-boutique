import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from './utils/api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

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
        `/api/printful-stock/${item.printful_variant_id}`
      );
      const data = res.data;
      const stockAvailable = data.available ?? 99;

      // Rechercher s’il y en a déjà dans le panier
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
    const updatedCart = cart.map((item) =>
      item.id === id ? { ...item, quantity } : item
    );
    setCart(updatedCart);
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
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

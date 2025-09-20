import api from './api';

export const logAbandonedCart = async (email, cartItems) => {
  try {
    await api.post('/api/log-abandoned-cart', {
      customer_email: email,
      cart_contents: JSON.stringify(cartItems)
    });
  } catch (err) {
    console.error('Erreur de log du panier abandonné:', err);
  }
};

import axios from 'axios';

export const logAbandonedCart = async (email, cartItems) => {
  try {
    await axios.post('http://localhost:4242/api/log-abandoned-cart', {
      customer_email: email,
      cart_contents: JSON.stringify(cartItems)
    });
    console.log('🛒 Panier abandonné loggé');
  } catch (err) {
    console.error('Erreur de log du panier abandonné:', err);
  }
};

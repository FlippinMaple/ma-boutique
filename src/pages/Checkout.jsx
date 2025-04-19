import { useCart } from '../CartContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  showCheckoutConfirm,
  showCheckoutError,
  showEmptyCartAlert
} from '../utils/alerts';
import './styles/Shop.css';

const Checkout = () => {
  const { cartItems, removeFromCart, clearCart, addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (cartItems.length === 0) {
      showEmptyCartAlert();
      setTimeout(() => {
        navigate('/shop');
      }, 2600);
    }
  }, [cartItems, navigate]);

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    const result = await showCheckoutConfirm();
    if (!result.isConfirmed) return;

    try {
      const response = await axios.post(
        'http://localhost:4242/create-checkout-session',
        { items: cartItems }
      );
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Erreur lors de la création de la session Stripe :', error);
      showCheckoutError();
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Panier</h2>
      {cartItems.length === 0 ? (
        <p>Ton panier est vide.</p>
      ) : (
        <div>
          {cartItems.map((item) => (
            <div key={item.id} style={{ marginBottom: '1.5rem' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: '60px', height: '60px', borderRadius: '6px' }}
                />
                <div>
                  <strong>{item.name}</strong>
                  <div className="shop-quantity-controls">
                    <button
                      className="shop-qty-btn"
                      onClick={() => removeFromCart(item.id)}
                    >
                      ➖
                    </button>
                    <span className="shop-qty-count">{item.quantity}</span>
                    <button
                      className="shop-qty-btn"
                      onClick={
                        () => addToCart({ ...item, quantity: 1 }) // ✅ FIX ICI
                      }
                    >
                      ➕
                    </button>
                  </div>
                  <p style={{ marginTop: '5px' }}>
                    {item.price.toFixed(2)} $ x {item.quantity} ={' '}
                    {(item.price * item.quantity).toFixed(2)} $
                  </p>
                </div>
              </div>
            </div>
          ))}
          <hr />
          <p>
            <strong>Total :</strong> {total.toFixed(2)} $
          </p>
          <button onClick={clearCart}>Vider le panier</button>
          <button onClick={handleCheckout} style={{ marginLeft: '1rem' }}>
            Payer maintenant
          </button>
        </div>
      )}
    </div>
  );
};

export default Checkout;

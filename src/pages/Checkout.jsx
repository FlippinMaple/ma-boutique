import { useCart } from '../CartContext';
import api from '../utils/api'; // chemin corrigé
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import ShippingOptions from '../components/ShippingOptions';
import toast from 'react-hot-toast';
import { formatEmail, capitalizeSmart } from '../utils/textHelpers';
import { provincesCA, statesUS } from '../utils/regionOptions';

const getAuthToken = () => {
  try {
    return localStorage.getItem('authToken');
  } catch {
    return null;
  }
};

const Checkout = () => {
  const { cart, removeFromCart, clearCart, addToCart } = useCart();

  const [userEmail, setUserEmail] = useState('');
  const [shipping, setShipping] = useState({
    name: '',
    address1: '',
    city: '',
    state: '',
    country: '',
    zip: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [shippingRate, setShippingRate] = useState(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!Array.isArray(cart) || cart.length === 0) {
      hasRedirected.current = true;
      toast.error('Ton panier est vide. Redirection...');
      setTimeout(() => {
        navigate('/shop');
      }, 2500);
    }
  }, [cart, navigate]);

  useEffect(() => {
    const handleBeforeUnload = async () => {
      const emailClean = formatEmail(userEmail);
      if (cart.length > 0 && emailClean) {
        try {
          await api.post('/api/log-abandoned-cart', {
            customer_email: emailClean,
            cart_contents: JSON.stringify(cart)
          });
        } catch {
          // on ignore volontairement les erreurs ici
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cart, userEmail]);

  const total = Array.isArray(cart)
    ? cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    : 0;

  const validateCheckout = () => {
    if (
      !userEmail ||
      !shipping.name ||
      !shipping.address1 ||
      !shipping.city ||
      !shipping.state ||
      !shipping.country ||
      !shipping.zip
    ) {
      toast.error('Tous les champs de livraison doivent être remplis.');
      return false;
    }
    if (!shippingRate) {
      toast.error('Veuillez sélectionner un mode de livraison.');
      return false;
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!validateCheckout()) return;

    const confirmed = window.confirm('Confirmer le paiement ?');
    if (!confirmed) return;

    setLoading(true);

    try {
      const preparedItems = cart.map((item) => ({
        id: item.id,
        name: capitalizeSmart(item.name),
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        printful_variant_id: item.printful_variant_id,
        variant_id: item.variant_id
      }));

      const payload = {
        items: preparedItems,
        customer_email: formatEmail(userEmail),
        shipping: {
          ...shipping,
          name: capitalizeSmart(shipping.name)
        },
        shipping_rate: shippingRate
      };

      const response = await api.post('/api/create-checkout-session', payload);

      if (response.data?.url) {
        toast.success('Redirection vers Stripe...');
        window.location.href = response.data.url;
      } else {
        toast.error('Erreur : aucune URL de paiement reçue.');
      }
    } catch (err) {
      console.error(
        'Stripe checkout error:',
        err.response?.data || err.message
      );
      toast.error(err?.response?.data?.error || 'Erreur durant le paiement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: 'auto' }}>
      <h2>Panier</h2>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="email">Adresse courriel :</label>
        <input
          id="email"
          type="email"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          placeholder="exemple@courriel.com"
          style={{
            marginLeft: '0.5rem',
            padding: '0.4rem',
            borderRadius: '6px',
            border: '1px solid #ccc'
          }}
          required
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input
          placeholder="Nom complet"
          value={shipping.name}
          onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
          style={{ marginBottom: 6, width: '100%' }}
          required
        />
        <input
          placeholder="Adresse"
          value={shipping.address1}
          onChange={(e) =>
            setShipping({ ...shipping, address1: e.target.value })
          }
          style={{ marginBottom: 6, width: '100%' }}
          required
        />
        <input
          placeholder="Ville"
          value={shipping.city}
          onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
          style={{ marginBottom: 6, width: '100%' }}
          required
        />
        <select
          value={shipping.country}
          onChange={(e) =>
            setShipping({ ...shipping, country: e.target.value })
          }
          style={{ marginBottom: 6, width: '100%' }}
          required
        >
          <option value="">Sélectionner un pays</option>
          <option value="CA">Canada</option>
          <option value="US">États-Unis</option>
        </select>
        <select
          value={shipping.state}
          onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
          style={{ marginBottom: 6, width: '100%' }}
          required
        >
          <option value="">Sélectionner une province ou un état</option>
          {shipping.country === 'CA' &&
            provincesCA.map((prov) => (
              <option key={prov.code} value={prov.code}>
                {prov.name}
              </option>
            ))}

          {shipping.country === 'US' &&
            statesUS.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
        </select>
        <input
          placeholder="Code postal"
          value={shipping.zip}
          onChange={(e) => setShipping({ ...shipping, zip: e.target.value })}
          style={{ marginBottom: 6, width: '100%' }}
          required
        />
      </div>

      {cart.map((item) => (
        <div
          key={item.id}
          style={{
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <img
            src={item.image}
            alt={item.name}
            style={{ width: '60px', height: '60px', borderRadius: '6px' }}
          />
          <div>
            <strong>{capitalizeSmart(item.name)}</strong>
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
                onClick={() => addToCart({ ...item, quantity: 1 })}
              >
                ➕
              </button>
            </div>
            <p style={{ marginTop: '5px' }}>
              {(Number(item.price) || 0).toFixed(2)} $ x {item.quantity} ={' '}
              {((Number(item.price) || 0) * item.quantity).toFixed(2)} $
            </p>
          </div>
        </div>
      ))}

      {shipping.name &&
        shipping.address1 &&
        shipping.city &&
        shipping.state &&
        shipping.country &&
        shipping.zip && (
          <ShippingOptions
            cartItems={cart}
            shippingInfo={shipping}
            onShippingSelected={setShippingRate}
          />
        )}

      <hr />
      <p>
        <strong>Sous-total :</strong> {total.toFixed(2)} $
      </p>
      {shippingRate && (
        <p>
          <strong>Livraison ({shippingRate.name}) :</strong>{' '}
          {parseFloat(shippingRate.rate).toFixed(2)} $
        </p>
      )}
      <p>
        <strong>Total à payer :</strong>{' '}
        {(total + (shippingRate ? parseFloat(shippingRate.rate) : 0)).toFixed(
          2
        )}{' '}
        $
      </p>

      <button onClick={clearCart}>Vider le panier</button>
      <button
        onClick={handleCheckout}
        disabled={loading || !shippingRate}
        style={{
          marginLeft: '1rem',
          padding: '10px 20px',
          backgroundColor: '#28a745',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '16px'
        }}
      >
        Payer maintenant
      </button>

      {loading && (
        <div style={{ marginTop: '1rem', color: '#007bff' }}>
          🔄 Redirection vers Stripe...
        </div>
      )}
    </div>
  );
};

export default Checkout;

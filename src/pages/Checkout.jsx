import { useCart } from '../CartContext';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import ShippingOptions from '../components/ShippingOptions';
import toast from 'react-hot-toast';
import { formatEmail, capitalizeSmart } from '../utils/textHelpers';
import { provincesCA, statesUS } from '../utils/regionOptions';

const Checkout = () => {
  const {
    cart,
    removeFromCart,
    clearCart,
    addToCart,
    shouldSuppressAbandonedLog,
    setInCheckoutFlag,
    updateQuantity
  } = useCart();

  const [userEmail, setUserEmail] = useState('');
  const [shipping, setShipping] = useState({
    name: '',
    address1: '',
    city: '',
    state: '',
    country: '',
    zip: ''
  });

  // Estimate cartId from first cart line if no global cartId
  const cartId =
    cart?.[0]?.cart_id || cart?.[0]?.cartId || cart?.[0]?.cart_id_db || null;

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [shippingRate, setShippingRate] = useState(null);
  const hasRedirected = useRef(false);

  // Reset shippingRate when address changes
  useEffect(() => {
    setShippingRate(null);
  }, [
    shipping.name,
    shipping.address1,
    shipping.city,
    shipping.state,
    shipping.country,
    shipping.zip
  ]);

  // Empty cart -> redirect to shop
  useEffect(() => {
    if (!Array.isArray(cart) || cart.length === 0) {
      hasRedirected.current = true;
      toast.error('Ton panier est vide. Redirection...');
      setTimeout(() => {
        navigate('/shop');
      }, 2500);
    }
  }, [cart, navigate]);

  // Abandoned checkout tracking
  useEffect(() => {
    // Clear inCheckout when landing on /checkout (back from Stripe)
    try {
      localStorage.removeItem('inCheckout');
    } catch {
      /* no-op */
    }

    const API_BASE =
      (import.meta.env.VITE_SERVER_URL &&
        import.meta.env.VITE_SERVER_URL.replace(/\/+$/, '')) ||
      window.location.origin;

    let sent = false;

    const sendAbandon = () => {
      if (sent) return;

      // Skip abandoned log when payment redirect flag is set
      if (
        typeof shouldSuppressAbandonedLog === 'function' &&
        shouldSuppressAbandonedLog()
      ) {
        return;
      }

      const raw = (userEmail || '').trim();
      const emailClean =
        (typeof formatEmail === 'function' && formatEmail(raw)) ||
        (raw.includes('@') ? raw.toLowerCase() : '');

      if (!emailClean || !Array.isArray(cart) || cart.length === 0) return;

      const payload = {
        customer_email: emailClean,
        cart_contents: cart.map(
          ({ id, name, quantity, price, variant_id, printful_variant_id }) => ({
            id,
            name,
            quantity,
            price,
            variant_id,
            printful_variant_id
          })
        ),
        reason: 'beforeunload'
      };

      const body = JSON.stringify(payload);
      const url = `${API_BASE}/api/log-abandoned-cart`;

      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([body], {
            type: 'text/plain;charset=UTF-8'
          });
          const ok = navigator.sendBeacon(url, blob);
          sent = ok;
          if (ok) return;
        }

        // fallback fetch keepalive
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true
        }).catch(() => {});
      } catch {
        // ignore
      } finally {
        sent = true;
      }
    };

    const onBeforeUnload = () => sendAbandon();
    const onPageHide = () => sendAbandon();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') sendAbandon();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Optional manual debug hook
    window.__abandonTest = sendAbandon;

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      try {
        delete window.__abandonTest;
      } catch {
        /* empty */
      }
    };
  }, [cart, userEmail, shouldSuppressAbandonedLog]);

  const total = Array.isArray(cart)
    ? cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    : 0;

  const validateCheckout = useCallback(() => {
    if (
      !userEmail ||
      !shipping.name ||
      !shipping.address1 ||
      !shipping.city ||
      !shipping.state ||
      !shipping.country ||
      !shipping.zip
    ) {
      toast.error('Tous les champs de livraison doivent etre remplis.');
      return false;
    }
    if (!shippingRate) {
      toast.error('Veuillez selectionner un mode de livraison.');
      return false;
    }
    return true;
  }, [userEmail, shipping, shippingRate]);

  const handleCheckout = useCallback(async () => {
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
        variant_id: item.variant_id,
        db_variant_id: item.db_variant_id
      }));

      const payload = {
        cartItems: preparedItems,
        cartId: cartId || null,
        customer_email: formatEmail(userEmail),
        shipping: {
          ...shipping,
          name: capitalizeSmart(shipping.name)
        },
        shipping_rate: shippingRate
          ? { name: shippingRate.name, rate: shippingRate.rate }
          : null
      };

      // api.baseURL already includes /api
      const response = await api.post('/create-checkout-session', payload, {
        withCredentials: true
      });

      if (response.data?.url) {
        toast.success('Redirection vers Stripe...');
        // Mark checkout-in-progress before Stripe redirect
        setInCheckoutFlag();

        // Do not clearCart here
        window.location.href = response.data.url;
      } else {
        toast.error('Erreur : aucune URL de paiement recue.');
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
  }, [
    cart,
    cartId,
    setInCheckoutFlag,
    shipping,
    shippingRate,
    userEmail,
    validateCheckout
  ]);

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
          <option value="">Selectionner un pays</option>
          <option value="CA">Canada</option>
          <option value="US">Etats-Unis</option>
        </select>

        <select
          value={shipping.state}
          onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
          style={{ marginBottom: 6, width: '100%' }}
          required
        >
          <option value="">Selectionner une province ou un etat</option>
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
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                title={
                  item.quantity <= 1 ? 'Quantite minimale atteinte' : 'Diminuer'
                }
              >
                -
              </button>

              <span className="shop-qty-count">{item.quantity}</span>

              <button
                className="shop-qty-btn"
                onClick={() => addToCart({ ...item, quantity: 1 })}
                title="Augmenter"
              >
                +
              </button>

              <button
                className="shop-qty-btn"
                onClick={() => removeFromCart(item.id)}
                title="Supprimer l'article"
                style={{ marginLeft: 8 }}
              >
                x
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
        <strong>Total a payer :</strong>{' '}
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
          Redirection vers Stripe...
        </div>
      )}
    </div>
  );
};

export default Checkout;

import { useCart } from '../CartContext';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import ShippingOptions from '../components/ShippingOptions';
import toast from 'react-hot-toast';
import { formatEmail, capitalizeSmart } from '../utils/textHelpers';
import { provincesCA, statesUS } from '../utils/regionOptions';
import './styles/Checkout.css';

const currencyFormatter = new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD'
});

const formatCurrency = (value) =>
  currencyFormatter.format(Number(value) || 0);

const CHECKOUT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [shippingRate, setShippingRate] = useState(null);
  const hasRedirected = useRef(false);
  const checkoutAttemptRef = useRef({
    signature: null,
    key: null
  });

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
    const onPageHide = (event) => {
      if (event.persisted) return;
      sendAbandon();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);

    // Optional manual debug hook
    window.__abandonTest = sendAbandon;

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
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

  const shippingTotal = shippingRate
    ? Number.parseFloat(shippingRate.rate) || 0
    : 0;

  const orderTotal = total + shippingTotal;

  const validateCheckout = useCallback(() => {
    const emailClean = String(userEmail || '').trim();
    if (
      !emailClean ||
      emailClean.length > 100 ||
      !CHECKOUT_EMAIL_PATTERN.test(emailClean)
    ) {
      toast.error('Adresse courriel invalide.');
      return false;
    }
    if (
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
    if (
      !shippingRate ||
      shippingRate.id == null ||
      String(shippingRate.id).trim() === ''
    ) {
      toast.error('Veuillez sélectionner un mode de livraison.');
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

      const checkoutPayload = {
        cartItems: preparedItems,
        customer_email: formatEmail(userEmail),
        shipping: {
          ...shipping,
          name: capitalizeSmart(shipping.name)
        },
        shipping_rate: { id: shippingRate.id }
      };

      const attemptSignature = JSON.stringify(checkoutPayload);
      if (
        !checkoutAttemptRef.current.key ||
        checkoutAttemptRef.current.signature !== attemptSignature
      ) {
        const newKey = globalThis.crypto?.randomUUID?.();
        if (!newKey) {
          toast.error(
            'Impossible de sécuriser cette tentative de paiement. Recharge la page et réessaie.'
          );
          return;
        }
        checkoutAttemptRef.current = {
          signature: attemptSignature,
          key: newKey
        };
      }

      const payload = {
        ...checkoutPayload,
        idempotency_key: checkoutAttemptRef.current.key
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
        toast.error('Erreur : aucune URL de paiement reçue.');
      }
    } catch (err) {
      console.error(
        'Stripe checkout error:',
        err.response?.data || err.message
      );
      if (err?.response?.data?.code === 'CHECKOUT_NO_LONGER_OPEN') {
        checkoutAttemptRef.current = {
          signature: null,
          key: null
        };
      }
      toast.error(err?.response?.data?.error || 'Erreur durant le paiement.');
    } finally {
      setLoading(false);
    }
  }, [
    cart,
    setInCheckoutFlag,
    shipping,
    shippingRate,
    userEmail,
    validateCheckout
  ]);

  return (
    <main className="checkout-page" id="main-content">
      <div className="checkout-page__inner">
        <header className="checkout-intro">
          <p className="checkout-intro__eyebrow">FLIPPIN’ MAPLE</p>
          <h1 className="checkout-intro__title">Finaliser la commande</h1>
          <p className="checkout-intro__copy">
            Vérifie tes articles et entre les renseignements nécessaires à la
            livraison.
          </p>
        </header>

        <div className="checkout-layout">
          <div className="checkout-main">
            <section
              className="checkout-section"
              aria-labelledby="checkout-contact-title"
            >
              <div className="checkout-section__header">
                <p className="checkout-section__number">01</p>
                <h2
                  className="checkout-section__title"
                  id="checkout-contact-title"
                >
                  Coordonnées
                </h2>
              </div>

              <div className="checkout-fields">
                <div className="checkout-field checkout-field--full">
                  <label
                    className="checkout-field__label"
                    htmlFor="checkout-email"
                  >
                    Adresse courriel
                  </label>
                  <input
                    className="checkout-field__control"
                    id="checkout-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="exemple@courriel.com"
                    maxLength={100}
                    required
                  />
                </div>
              </div>
            </section>

            <section
              className="checkout-section"
              aria-labelledby="checkout-address-title"
            >
              <div className="checkout-section__header">
                <p className="checkout-section__number">02</p>
                <h2
                  className="checkout-section__title"
                  id="checkout-address-title"
                >
                  Adresse de livraison
                </h2>
              </div>

              <div className="checkout-fields">
                <div className="checkout-field">
                  <label
                    className="checkout-field__label"
                    htmlFor="shipping-name"
                  >
                    Nom complet
                  </label>
                  <input
                    className="checkout-field__control"
                    id="shipping-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={shipping.name}
                    onChange={(e) =>
                      setShipping({ ...shipping, name: e.target.value })
                    }
                    placeholder="Prénom et nom"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="checkout-field checkout-field--full">
                  <label
                    className="checkout-field__label"
                    htmlFor="shipping-address"
                  >
                    Adresse
                  </label>
                  <input
                    className="checkout-field__control"
                    id="shipping-address"
                    name="address1"
                    type="text"
                    autoComplete="street-address"
                    value={shipping.address1}
                    onChange={(e) =>
                      setShipping({ ...shipping, address1: e.target.value })
                    }
                    placeholder="Numéro et rue"
                    maxLength={200}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label
                    className="checkout-field__label"
                    htmlFor="shipping-city"
                  >
                    Ville
                  </label>
                  <input
                    className="checkout-field__control"
                    id="shipping-city"
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    value={shipping.city}
                    onChange={(e) =>
                      setShipping({ ...shipping, city: e.target.value })
                    }
                    maxLength={100}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label
                    className="checkout-field__label"
                    htmlFor="shipping-country"
                  >
                    Pays
                  </label>
                  <select
                    className="checkout-field__control"
                    id="shipping-country"
                    name="country"
                    autoComplete="country"
                    value={shipping.country}
                    onChange={(e) =>
                      setShipping({ ...shipping, country: e.target.value })
                    }
                    required
                  >
                    <option value="">Sélectionner un pays</option>
                    <option value="CA">Canada</option>
                    <option value="US">États-Unis</option>
                  </select>
                </div>

                <div className="checkout-field">
                  <label
                    className="checkout-field__label"
                    htmlFor="shipping-state"
                  >
                    Province ou État
                  </label>
                  <select
                    className="checkout-field__control"
                    id="shipping-state"
                    name="state"
                    autoComplete="address-level1"
                    value={shipping.state}
                    onChange={(e) =>
                      setShipping({ ...shipping, state: e.target.value })
                    }
                    required
                  >
                    <option value="">
                      Sélectionner une province ou un État
                    </option>
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
                </div>

                <div className="checkout-field">
                  <label
                    className="checkout-field__label"
                    htmlFor="shipping-zip"
                  >
                    Code postal
                  </label>
                  <input
                    className="checkout-field__control"
                    id="shipping-zip"
                    name="zip"
                    type="text"
                    autoComplete="postal-code"
                    value={shipping.zip}
                    onChange={(e) =>
                      setShipping({ ...shipping, zip: e.target.value })
                    }
                    maxLength={10}
                    required
                  />
                </div>
              </div>
            </section>

            {shipping.name &&
              shipping.address1 &&
              shipping.city &&
              shipping.state &&
              shipping.country &&
              shipping.zip && (
                <section
                  className="checkout-section"
                  aria-labelledby="checkout-shipping-title"
                >
                  <div className="checkout-section__header">
                    <p className="checkout-section__number">03</p>
                    <h2
                      className="checkout-section__title"
                      id="checkout-shipping-title"
                    >
                      Livraison
                    </h2>
                  </div>

                  <ShippingOptions
                    cartItems={cart}
                    shippingInfo={shipping}
                    onShippingSelected={setShippingRate}
                  />
                </section>
              )}
          </div>

          <aside
            className="checkout-summary"
            aria-labelledby="checkout-summary-title"
          >
            <div className="checkout-summary__header">
              <p className="checkout-summary__eyebrow">Ta sélection</p>
              <h2
                className="checkout-summary__title"
                id="checkout-summary-title"
              >
                Résumé de la commande
              </h2>
            </div>

            <div className="checkout-items">
              {cart.map((item) => {
                const itemPrice = Number(item.price) || 0;
                const itemTotal = itemPrice * item.quantity;

                return (
                  <article className="checkout-item" key={item.id}>
                    <div className="checkout-item__media">
                      {item.image ? (
                        <img
                          className="checkout-item__image"
                          src={item.image}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div
                          className="checkout-item__image-fallback"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <div className="checkout-item__content">
                      <h3 className="checkout-item__name">
                        {capitalizeSmart(item.name)}
                      </h3>

                      {item.color || item.size ? (
                        <p className="checkout-item__variant">
                          {[item.color, item.size].filter(Boolean).join(' · ')}
                        </p>
                      ) : null}

                      <div
                        className="checkout-item__quantity"
                        aria-label={`Quantité pour ${capitalizeSmart(item.name)}`}
                      >
                        <button
                          type="button"
                          className="checkout-quantity-button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          aria-label={`Diminuer la quantité de ${capitalizeSmart(item.name)}`}
                        >
                          −
                        </button>

                        <span
                          className="checkout-quantity-value"
                          aria-live="polite"
                        >
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          className="checkout-quantity-button"
                          onClick={() => addToCart({ ...item, quantity: 1 })}
                          aria-label={`Augmenter la quantité de ${capitalizeSmart(item.name)}`}
                        >
                          +
                        </button>

                        <button
                          type="button"
                          className="checkout-item__remove"
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Supprimer ${capitalizeSmart(item.name)} du panier`}
                        >
                          Supprimer
                        </button>
                      </div>

                      <p className="checkout-item__price">
                        {formatCurrency(itemPrice)} × {item.quantity}
                      </p>
                    </div>

                    <p className="checkout-item__total">
                      {formatCurrency(itemTotal)}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="checkout-totals">
              <div className="checkout-total-row">
                <span>Sous-total</span>
                <span>{formatCurrency(total)}</span>
              </div>

              {shippingRate ? (
                <div className="checkout-total-row">
                  <span>Livraison — {shippingRate.name}</span>
                  <span>{formatCurrency(shippingTotal)}</span>
                </div>
              ) : (
                <div className="checkout-total-row checkout-total-row--muted">
                  <span>Livraison</span>
                  <span>À sélectionner</span>
                </div>
              )}

              <div className="checkout-total-row checkout-total-row--grand">
                <span>Total</span>
                <span>{formatCurrency(orderTotal)}</span>
              </div>
            </div>

            <div className="checkout-actions">
              <button
                type="button"
                className="checkout-button checkout-button--secondary"
                onClick={clearCart}
              >
                Vider le panier
              </button>

              <button
                type="button"
                className="checkout-button checkout-button--primary"
                onClick={handleCheckout}
                disabled={loading || !shippingRate}
              >
                {loading ? 'Redirection...' : 'Passer au paiement'}
              </button>
            </div>

            {loading ? (
              <p
                className="checkout-status"
                role="status"
                aria-live="polite"
              >
                Redirection sécurisée vers Stripe...
              </p>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Checkout;

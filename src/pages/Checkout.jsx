import { useCart } from '../CartContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  showCheckoutConfirm,
  showCheckoutError,
  showEmptyCartAlert
} from '../utils/alerts';
import ShippingOptions from '../components/ShippingOptions';

const Checkout = () => {
  const { cartItems, removeFromCart, clearCart, addToCart } = useCart();
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

  useEffect(() => {
    if (cartItems.length === 0) {
      showEmptyCartAlert();
      setTimeout(() => {
        navigate('/shop');
      }, 2600);
    }
  }, [cartItems, navigate]);

  // 🛒 Panier abandonné (optionnel, à garder si utile)
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (cartItems.length > 0 && userEmail) {
        await axios.post('/api/log-abandoned-cart', {
          customer_email: userEmail,
          cart_contents: JSON.stringify(cartItems)
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cartItems, userEmail]);

  const total = cartItems.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1),
    0
  );

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (
      !userEmail ||
      !shipping.name ||
      !shipping.address1 ||
      !shipping.city ||
      !shipping.state ||
      !shipping.country ||
      !shipping.zip
    ) {
      alert('Veuillez remplir tous les champs de livraison.');
      return;
    }

    const result = await showCheckoutConfirm();
    if (!result.isConfirmed) return;

    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:4242/create-checkout-session',
        {
          items: cartItems.map((item) => ({
            ...item,
            printful_variant_id: item.variant_id
          })),
          customer_email: userEmail,
          shipping
        }
      );

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Erreur lors du checkout Stripe :', error);

      const message =
        error?.response?.data?.error ||
        'Une erreur est survenue lors de la commande.';

      if (message.includes("n'est plus disponible")) {
        await Swal.fire({
          icon: 'error',
          title: 'Produit hors stock',
          text: message,
          confirmButtonText: 'Retour'
        });
      } else {
        showCheckoutError();
      }
    }

    setLoading(false);
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
      {/* Champs adresse de livraison */}
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

          {/* Si shipping.country === 'CA' */}
          {shipping.country === 'CA' && (
            <>
              <option value="AB">Alberta</option>
              <option value="BC">Colombie-Britannique</option>
              <option value="MB">Manitoba</option>
              <option value="NB">Nouveau-Brunswick</option>
              <option value="NL">Terre-Neuve-et-Labrador</option>
              <option value="NS">Nouvelle-Écosse</option>
              <option value="NT">Territoires du Nord-Ouest</option>
              <option value="NU">Nunavut</option>
              <option value="ON">Ontario</option>
              <option value="PE">Île-du-Prince-Édouard</option>
              <option value="QC">Québec</option>
              <option value="SK">Saskatchewan</option>
              <option value="YT">Yukon</option>
            </>
          )}

          {/* Si shipping.country === 'US' */}
          {shipping.country === 'US' && (
            <>
              <option value="AL">Alabama</option>
              <option value="AK">Alaska</option>
              <option value="AZ">Arizona</option>
              <option value="AR">Arkansas</option>
              <option value="CA">Californie</option>
              <option value="CO">Colorado</option>
              <option value="CT">Connecticut</option>
              <option value="DE">Delaware</option>
              <option value="FL">Floride</option>
              <option value="GA">Géorgie</option>
              <option value="HI">Hawaï</option>
              <option value="ID">Idaho</option>
              <option value="IL">Illinois</option>
              <option value="IN">Indiana</option>
              <option value="IA">Iowa</option>
              <option value="KS">Kansas</option>
              <option value="KY">Kentucky</option>
              <option value="LA">Louisiane</option>
              <option value="ME">Maine</option>
              <option value="MD">Maryland</option>
              <option value="MA">Massachusetts</option>
              <option value="MI">Michigan</option>
              <option value="MN">Minnesota</option>
              <option value="MS">Mississippi</option>
              <option value="MO">Missouri</option>
              <option value="MT">Montana</option>
              <option value="NE">Nebraska</option>
              <option value="NV">Nevada</option>
              <option value="NH">New Hampshire</option>
              <option value="NJ">New Jersey</option>
              <option value="NM">Nouveau-Mexique</option>
              <option value="NY">New York</option>
              <option value="NC">Caroline du Nord</option>
              <option value="ND">Dakota du Nord</option>
              <option value="OH">Ohio</option>
              <option value="OK">Oklahoma</option>
              <option value="OR">Oregon</option>
              <option value="PA">Pennsylvanie</option>
              <option value="RI">Rhode Island</option>
              <option value="SC">Caroline du Sud</option>
              <option value="SD">Dakota du Sud</option>
              <option value="TN">Tennessee</option>
              <option value="TX">Texas</option>
              <option value="UT">Utah</option>
              <option value="VT">Vermont</option>
              <option value="VA">Virginie</option>
              <option value="WA">Washington</option>
              <option value="WV">Virginie-Occidentale</option>
              <option value="WI">Wisconsin</option>
              <option value="WY">Wyoming</option>
            </>
          )}
        </select>
        <input
          placeholder="Code postal"
          value={shipping.zip}
          onChange={(e) => setShipping({ ...shipping, zip: e.target.value })}
          style={{ marginBottom: 6, width: '100%' }}
          required
        />
      </div>

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
            </div>
          ))}
          <ShippingOptions
            cartItems={cartItems}
            shippingInfo={shipping}
            onShippingSelected={setShippingRate}
          />

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
            {(
              total + (shippingRate ? parseFloat(shippingRate.rate) : 0)
            ).toFixed(2)}{' '}
            $
          </p>

          <button onClick={clearCart}>Vider le panier</button>
          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{ marginLeft: '1rem' }}
          >
            Payer maintenant
          </button>

          {/* 🔧 TEST CALCUL LIVRAISON */}
          <button
            onClick={async () => {
              const payload = {
                recipient: shipping,
                items: cartItems.map((item) => ({
                  variant_id: item.variant_id, // ✅ court ID
                  quantity: item.quantity
                }))
              };

              console.log('🔍 Payload envoyé à Printful:', payload);

              try {
                const res = await axios.post(
                  'http://localhost:4242/api/shipping-rates',
                  payload
                );
                console.log('📦 Tarifs de livraison reçus:', res.data);
              } catch (err) {
                console.error(
                  '❌ Erreur retour Printful:',
                  err.response?.data || err.message
                );
              }
            }}
            style={{
              marginTop: '1rem',
              backgroundColor: '#007bff',
              color: '#fff',
              padding: '8px 12px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Tester le calcul des frais de livraison
          </button>
        </div>
      )}
      {loading && <div>Traitement en cours...</div>}
    </div>
  );
};

export default Checkout;

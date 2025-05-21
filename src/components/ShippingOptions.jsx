import { useState, useEffect } from 'react';
import axios from 'axios';

const ShippingOptions = ({ cartItems, shippingInfo, onShippingSelected }) => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    const fetchRates = async () => {
      if (
        !shippingInfo ||
        !shippingInfo.address1?.trim() ||
        !shippingInfo.city?.trim() ||
        !shippingInfo.state?.trim() ||
        !shippingInfo.country?.trim() ||
        !shippingInfo.zip?.trim()
      ) {
        console.log('⛔ Infos de livraison incomplètes.');
        return;
      }

      const items = cartItems
        .filter((item) => item.variant_id && item.quantity > 0)
        .map((item) => ({
          variant_id: Number(item.variant_id),
          quantity: item.quantity
        }));

      if (items.length === 0) {
        console.log('⛔ Aucun item valide dans le panier.');
        return;
      }

      setLoading(true);

      try {
        console.log('🔍 Payload envoyé à Printful:', {
          recipient: shippingInfo,
          items
        });

        const res = await axios.post(
          'http://localhost:4242/api/shipping-rates',
          {
            recipient: shippingInfo,
            items
          }
        );

        setRates(res.data);
      } catch (err) {
        console.error(
          'Erreur lors de la récupération des tarifs de livraison',
          err.response?.data || err.message
        );
      }

      setLoading(false);
    };

    fetchRates();
  }, [cartItems, shippingInfo]);
  <button
    onClick={() => {
      console.log('📦 Cart Items:', cartItems);
      console.log('📮 Shipping Info:', shippingInfo);
    }}
  >
    🔍 Debug données
  </button>;

  const handleSelect = (option) => {
    setSelectedOption(option);
    onShippingSelected(option);
  };

  return (
    <div>
      <h4>Options de livraison :</h4>
      {loading && <p>Chargement des tarifs...</p>}
      {!loading && rates.length === 0 && (
        <p>Aucune option de livraison disponible. Vérifie l’adresse.</p>
      )}

      <ul style={{ paddingLeft: 0 }}>
        {rates.map((rate) => (
          <li
            key={rate.id}
            style={{ listStyle: 'none', marginBottom: '0.5rem' }}
          >
            <label>
              <input
                type="radio"
                name="shipping"
                value={rate.id}
                checked={selectedOption?.id === rate.id}
                onChange={() => handleSelect(rate)}
              />
              <strong> {rate.name}</strong> – {rate.rate} {rate.currency} (
              {rate.min_delivery_days}-{rate.max_delivery_days} jours)
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ShippingOptions;

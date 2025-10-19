import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ShippingOptions = ({ cartItems, shippingInfo, onShippingSelected }) => {
  const [rates, setRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);

  useEffect(() => {
    const fetchRates = async () => {
      if (
        !shippingInfo.name ||
        !shippingInfo.address1 ||
        !shippingInfo.city ||
        !shippingInfo.state ||
        !shippingInfo.country ||
        !shippingInfo.zip
      ) {
        return;
      }

      try {
        const response = await axios.post(
          'http://localhost:4242/api/shipping/rates',
          {
            recipient: shippingInfo,
            items: cartItems.map((item) => ({
              printful_variant_id: item.printful_variant_id, // ← LONG ID
              quantity: item.quantity
            }))
          }
        );

        const rawRates = response?.data;

        if (!Array.isArray(rawRates)) {
          console.warn(
            '⚠️ Aucun tarif reçu ou format inattendu :',
            response.data
          );
          setRates([]);
          return;
        }

        const validRates = rawRates.filter((rate) =>
          ['flat', 'express'].some((label) =>
            rate.name.toLowerCase().includes(label)
          )
        );

        setRates(validRates);

        if (validRates.length > 0) {
          setSelectedRate(validRates[0]);
          onShippingSelected(validRates[0]);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des tarifs :', error);
        setRates([]);
      }
    };

    fetchRates();
  }, [cartItems, shippingInfo, onShippingSelected]);

  const handleSelect = (rate) => {
    setSelectedRate(rate);
    onShippingSelected(rate);
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>Méthode de livraison</h3>
      {rates.length === 0 ? (
        <p>Aucune option disponible pour cette adresse.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {rates.map((rate, index) => {
            const isSelected = selectedRate?.id === rate.id;
            const isFlat = rate.name.toLowerCase().includes('flat');

            return (
              <div
                key={index}
                onClick={() => handleSelect(rate)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  border: `2px solid ${isSelected ? '#28a745' : '#ccc'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#f4fff7' : '#fff',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <strong>{rate.name}</strong>{' '}
                  {isFlat && (
                    <span
                      style={{
                        backgroundColor: '#28a745',
                        color: '#fff',
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: '12px',
                        marginLeft: '0.5rem'
                      }}
                    >
                      Recommandé
                    </span>
                  )}
                  <div
                    style={{
                      fontSize: '0.9rem',
                      color: '#555',
                      marginTop: '4px'
                    }}
                  >
                    Livraison estimée :{' '}
                    {rate.estimated_delivery || 'non précisée'}
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                  {parseFloat(rate.rate).toFixed(2)} CAD
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShippingOptions;

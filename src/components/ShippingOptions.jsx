import { useEffect, useState } from 'react';
import axios from 'axios';

const currencyFormatter = new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD'
});

const formatCurrency = (value) =>
  currencyFormatter.format(Number(value) || 0);

const RATES_DEBOUNCE_MS = 800;

function isCanceledRequest(error) {
  return (
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError' ||
    error?.name === 'AbortError'
  );
}

const ShippingOptions = ({ cartItems, shippingInfo, onShippingSelected }) => {
  const [rates, setRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    let timerId = null;
    const controller = new AbortController();

    const addressComplete = Boolean(
      shippingInfo.name &&
        shippingInfo.address1 &&
        shippingInfo.city &&
        shippingInfo.state &&
        shippingInfo.country &&
        shippingInfo.zip
    );

    if (!addressComplete) {
      setRates([]);
      setSelectedRate(null);
      setHasFetched(false);
      setLoading(false);
      onShippingSelected(null);
      return () => {
        isCurrent = false;
        controller.abort();
      };
    }

    setLoading(true);
    setHasFetched(false);
    setRates([]);
    setSelectedRate(null);
    onShippingSelected(null);

    const fetchRates = async () => {
      try {
        const response = await axios.post(
          '/api/shipping/rates',
          {
            recipient: shippingInfo,
            items: cartItems.map((item) => ({
              printful_variant_id: item.printful_variant_id,
              quantity: item.quantity
            }))
          },
          { signal: controller.signal }
        );

        if (!isCurrent) return;

        const rawRates = response?.data;

        if (!Array.isArray(rawRates)) {
          console.warn(
            '⚠️ Aucun tarif reçu ou format inattendu :',
            response.data
          );
          setRates([]);
          setSelectedRate(null);
          setHasFetched(true);
          onShippingSelected(null);
          return;
        }

        const validRates = rawRates.filter((rate) =>
          ['flat', 'express'].some((label) =>
            rate.name.toLowerCase().includes(label)
          )
        );

        setRates(validRates);
        setHasFetched(true);

        if (validRates.length > 0) {
          setSelectedRate(validRates[0]);
          onShippingSelected(validRates[0]);
        } else {
          setSelectedRate(null);
          onShippingSelected(null);
        }
      } catch (error) {
        if (!isCurrent || isCanceledRequest(error)) return;
        console.error('Erreur lors de la récupération des tarifs :', error);
        setRates([]);
        setSelectedRate(null);
        setHasFetched(true);
        onShippingSelected(null);
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    timerId = window.setTimeout(fetchRates, RATES_DEBOUNCE_MS);

    return () => {
      isCurrent = false;
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [cartItems, shippingInfo, onShippingSelected]);

  const handleSelect = (rate) => {
    setSelectedRate(rate);
    onShippingSelected(rate);
  };

  return (
    <section
      className="shipping-options"
      aria-labelledby="shipping-options-title"
    >
      <div className="shipping-options__header">
        <h3 className="shipping-options__title" id="shipping-options-title">
          Méthode de livraison
        </h3>

        <p className="shipping-options__copy">
          Choisis l’option qui convient à ta commande.
        </p>
      </div>

      {loading ? (
        <p
          className="shipping-options__status"
          role="status"
          aria-live="polite"
        >
          Recherche des options de livraison...
        </p>
      ) : null}

      {!loading && hasFetched && rates.length === 0 ? (
        <p
          className="shipping-options__status shipping-options__status--empty"
          role="status"
        >
          Aucune option de livraison n’est disponible pour cette adresse.
        </p>
      ) : null}

      {!loading && rates.length > 0 ? (
        <fieldset className="shipping-options__list">
          <legend className="sr-only">Options de livraison disponibles</legend>

          {rates.map((rate) => {
            const isSelected = selectedRate === rate;
            const isFlat = rate.name.toLowerCase().includes('flat');
            const rateKey =
              rate.id ||
              `${rate.name}-${rate.rate}-${rate.estimated_delivery || ''}`;

            return (
              <label
                className={`shipping-option ${
                  isSelected ? 'is-selected' : ''
                }`}
                key={rateKey}
              >
                <input
                  className="shipping-option__input"
                  type="radio"
                  name="shipping-rate"
                  checked={isSelected}
                  onChange={() => handleSelect(rate)}
                />

                <span className="shipping-option__content">
                  <span className="shipping-option__name-row">
                    <span className="shipping-option__name">{rate.name}</span>

                    {isFlat ? (
                      <span className="shipping-option__badge">
                        Recommandé
                      </span>
                    ) : null}
                  </span>

                  <span className="shipping-option__estimate">
                    Livraison estimée :{' '}
                    {rate.estimated_delivery || 'non précisée'}
                  </span>
                </span>

                <span className="shipping-option__price">
                  {formatCurrency(rate.rate)}
                </span>
              </label>
            );
          })}
        </fieldset>
      ) : null}
    </section>
  );
};

export default ShippingOptions;

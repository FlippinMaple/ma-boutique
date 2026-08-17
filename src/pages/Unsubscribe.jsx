import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import './styles/Unsubscribe.css';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('e') || '';
  const hasToken = token.trim().length > 0;

  const [status, setStatus] = useState(hasToken ? 'confirm' : 'missing');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUnsubscribe = async (event) => {
    event.preventDefault();
    if (!hasToken || isSubmitting) return;
    if (status !== 'confirm' && status !== 'error') return;

    setIsSubmitting(true);
    try {
      await api.post('/unsubscribe', { token });
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="unsubscribe" id="main-content">
      <div className="unsubscribe__panel">
        <p className="unsubscribe__eyebrow">Flippin’ Maple</p>
        <h1 className="unsubscribe__title">Désabonnement</h1>

        {status === 'missing' ? (
          <p className="unsubscribe__copy">
            Ce lien de désabonnement est invalide ou incomplet.
          </p>
        ) : null}

        {status === 'confirm' ? (
          <>
            <p className="unsubscribe__copy">
              Confirmez si vous souhaitez cesser de recevoir les communications
              marketing de Flippin’ Maple.
            </p>
            <form onSubmit={handleUnsubscribe}>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Traitement…' : 'Me désabonner'}
              </button>
            </form>
          </>
        ) : null}

        {status === 'success' ? (
          <p className="unsubscribe__copy" role="status">
            Vous êtes maintenant désabonné(e) des communications marketing de
            Flippin’ Maple.
          </p>
        ) : null}

        {status === 'error' ? (
          <>
            <p className="unsubscribe__copy" role="alert">
              Impossible de traiter le désabonnement pour le moment. Réessayez
              plus tard ou utilisez le lien reçu dans le courriel.
            </p>
            <form onSubmit={handleUnsubscribe}>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Traitement…' : 'Réessayer'}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </main>
  );
};

export default Unsubscribe;

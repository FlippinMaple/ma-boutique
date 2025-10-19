// src/pages/Success.jsx
import { useEffect } from 'react';
import api from '../utils/api';
import { useCart } from '../CartContext';

const Success = () => {
  // On récupère les helpers du contexte
  const { clearCart, clearInCheckoutFlag } = useCart();

  useEffect(() => {
    const run = async () => {
      try {
        // 1) Nettoie le flag "en checkout" dès l'arrivée ici
        try {
          clearInCheckoutFlag();
        } catch {
          /* empty */
        }

        // 2) Vérifie la session Stripe côté serveur (optionnel)
        const url = new URL(window.location.href);
        const sessionId = url.searchParams.get('session_id');
        if (sessionId) {
          try {
            await api.get(
              `/api/payments/verify?session_id=${encodeURIComponent(sessionId)}`
            );
          } catch (e) {
            console.warn('[Success] verify failed', e);
          }
        }

        // 3) Vide le panier (ne bloque pas la redirection si ça échoue)
        try {
          const maybe = clearCart?.();
          if (maybe && typeof maybe.then === 'function') await maybe;
        } catch {
          /* noop */
        }
      } finally {
        // 4) Redirige vers la boutique (une seule fois)
        const target = `${window.location.origin}/shop?flash=merci`;
        window.location.replace(target);
      }
    };

    run();
  }, [clearCart, clearInCheckoutFlag]);

  return null;
};

export default Success;

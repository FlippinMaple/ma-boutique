// src/pages/Success.jsx
import { useEffect } from 'react';
import api from '../utils/api';
import { useCart } from '../CartContext';

const Success = () => {
  const { clearCart } = useCart?.() || {};

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const sessionId = url.searchParams.get('session_id');

        // (Optionnel) Valider côté serveur
        if (sessionId) {
          try {
            await api.get(
              `/api/payments/verify?session_id=${encodeURIComponent(sessionId)}`
            );
          } catch (e) {
            // même si la vérif échoue, on ne reste pas coincé ici
            console.warn('[Success] verify failed', e);
          }
        }

        // vider le panier si possible (sans bloquer la redirection)
        try {
          const maybe = clearCart?.();
          if (maybe && typeof maybe.then === 'function') await maybe;
        } catch {
          /* empty */
        }
      } finally {
        // 🚪 Sortie "bulldozer": on quitte la page en dur
        const target = `${window.location.origin}/shop`;
        window.location.replace(target);
      }
    };

    run();
  }, [clearCart]);

  // après clearCart()
  const target = `${window.location.origin}/shop?flash=merci`;
  window.location.replace(target);

  return null;
};

export default Success;

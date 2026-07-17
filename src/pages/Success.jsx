// src/pages/Success.jsx
import { useEffect } from 'react';
import api from '../utils/api';
import { useCart } from '../CartContext';

const Success = () => {
  const { clearCart, clearInCheckoutFlag } = useCart();

  useEffect(() => {
    const run = async () => {
      let isPaid = false;

      try {
        // Clear inCheckout flag after Stripe return
        try {
          clearInCheckoutFlag();
        } catch {
          /* ignore */
        }

        // Confirm payment with backend (not only presence of session_id)
        const url = new URL(window.location.href);
        const sessionId = url.searchParams.get('session_id');

        if (sessionId) {
          try {
            const verifyRes = await api.get(
              `/payments/verify?session_id=${encodeURIComponent(sessionId)}`
            );

            // Expected shape: { paid: true/false, ... }
            if (verifyRes?.data?.paid === true) {
              isPaid = true;
            }
          } catch (e) {
            console.warn('[Success] verify failed', e);
          }
        }

        // Clear cart only when backend confirms paid
        if (isPaid) {
          try {
            const maybe = clearCart?.();
            if (maybe && typeof maybe.then === 'function') {
              await maybe;
            }
          } catch {
            /* ignore */
          }
        }
      } finally {
        // Final redirect to shop
        const target = `${window.location.origin}/shop?flash=merci`;
        window.location.replace(target);
      }
    };

    run();
  }, [clearCart, clearInCheckoutFlag]);

  return null;
};

export default Success;

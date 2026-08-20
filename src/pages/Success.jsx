// src/pages/Success.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useCart } from '../CartContext';

const EXPECTED_CHECKOUT_SESSION_KEY = 'flippinMapleCheckoutSessionId';
const VERIFY_MAX_ATTEMPTS = 8;
const VERIFY_RETRY_DELAY_MS = 1000;
const VERIFY_REQUEST_TIMEOUT_MS = 5000;

function readExpectedSessionId() {
  try {
    return sessionStorage.getItem(EXPECTED_CHECKOUT_SESSION_KEY);
  } catch {
    return null;
  }
}

function consumeExpectedSessionId() {
  try {
    sessionStorage.removeItem(EXPECTED_CHECKOUT_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);
    if (!signal) return;
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

const Success = () => {
  const navigate = useNavigate();
  const { clearCart, clearInCheckoutFlag } = useCart();

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const goToShop = (purchaseSuccess) => {
      if (cancelled) return;
      if (purchaseSuccess === true) {
        navigate('/shop', {
          replace: true,
          state: { purchaseSuccess: true }
        });
        return;
      }
      navigate('/shop', { replace: true });
    };

    const run = async () => {
      const sessionId = new URL(window.location.href).searchParams.get(
        'session_id'
      );
      const expectedSessionId = readExpectedSessionId();

      if (
        typeof sessionId !== 'string' ||
        sessionId.length === 0 ||
        typeof expectedSessionId !== 'string' ||
        expectedSessionId.length === 0 ||
        sessionId !== expectedSessionId
      ) {
        goToShop(false);
        return;
      }

      let paidConfirmed = false;

      for (let attempt = 0; attempt < VERIFY_MAX_ATTEMPTS; attempt += 1) {
        if (cancelled) return;
        if (attempt > 0) {
          try {
            await delay(VERIFY_RETRY_DELAY_MS, controller.signal);
          } catch {
            return;
          }
        }
        if (cancelled) return;

        try {
          const verifyRes = await api.get(
            `/payments/verify?session_id=${encodeURIComponent(sessionId)}`,
            { signal: controller.signal, timeout: VERIFY_REQUEST_TIMEOUT_MS }
          );
          if (
            verifyRes?.data?.found === true &&
            verifyRes?.data?.paid === true
          ) {
            paidConfirmed = true;
            break;
          }
        } catch {
          if (cancelled || controller.signal.aborted) return;
        }
      }

      if (cancelled) return;

      consumeExpectedSessionId();

      if (!paidConfirmed) {
        goToShop(false);
        return;
      }

      try {
        const maybe = clearCart?.();
        if (maybe && typeof maybe.then === 'function') {
          await maybe;
        }
      } catch {
        /* ignore */
      }
      try {
        clearInCheckoutFlag();
      } catch {
        /* ignore */
      }

      goToShop(true);
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [clearCart, clearInCheckoutFlag, navigate]);

  return null;
};

export default Success;

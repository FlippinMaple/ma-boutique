// src/pages/Cancel.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useCart } from '../CartContext';

const Cancel = () => {
  const navigate = useNavigate();
  const hasShownToast = useRef(false);
  const { clearInCheckoutFlag } = useCart();

  useEffect(() => {
    // Leave checkout-in-progress mode
    try {
      clearInCheckoutFlag();
    } catch {
      /* ignore */
    }

    if (hasShownToast.current) return;
    hasShownToast.current = true;

    toast.error('Transaction annulée. Retour à la boutique…', {
      duration: 3000,
      id: 'checkout-cancelled'
    });

    const timer = setTimeout(() => {
      navigate('/shop');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, clearInCheckoutFlag]);

  return null;
};

export default Cancel;

import { useEffect, useRef } from 'react';
import { useCart } from '../CartContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Success = () => {
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const hasShownAlert = useRef(false); // 🔒 Empêche le toast en double

  useEffect(() => {
    if (hasShownAlert.current) return;
    hasShownAlert.current = true;

    toast.success('Merci pour ton achat 🎉 Tu seras redirigé sous peu...', {
      duration: 3000,
      style: {
        background: '#f0fff4',
        color: '#1a202c'
      }
    });

    const timeout = setTimeout(() => {
      clearCart();
      navigate('/shop');
    }, 3200); // léger délai pour laisser le toast se jouer

    return () => clearTimeout(timeout);
  }, [clearCart, navigate]);

  return null;
};

export default Success;

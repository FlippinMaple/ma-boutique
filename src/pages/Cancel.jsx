import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Cancel = () => {
  const navigate = useNavigate();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (hasShownToast.current) return;
    hasShownToast.current = true;

    toast.error('Transaction annulée ❌ Retour à la boutique...', {
      duration: 3000,
      position: 'top-center',
      style: {
        background: '#fff0f0',
        color: '#1a202c',
        fontWeight: '500'
      }
    });

    const timer = setTimeout(() => {
      navigate('/shop');
    }, 3000);

    return () => clearTimeout(timer); // Nettoyage
  }, [navigate]);

  return null;
};

export default Cancel;

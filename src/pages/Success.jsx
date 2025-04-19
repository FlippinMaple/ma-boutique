import { useEffect, useRef } from 'react';
import { useCart } from '../CartContext';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const Success = () => {
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const hasShownAlert = useRef(false); // 🔒 Anti-double popup

  useEffect(() => {
    if (hasShownAlert.current) return;
    hasShownAlert.current = true;

    setTimeout(() => {
      Swal.fire({
        icon: 'success',
        title: 'Merci pour ton achat 🎉',
        text: 'Tu vas être redirigé vers la boutique...',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#f0fff4',
        color: '#1a202c',
        didClose: () => {
          clearCart();
          navigate('/shop');
        }
      });
    }, 100);
  }, [clearCart, navigate]);

  return null;
};

export default Success;

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const Cancel = () => {
  const navigate = useNavigate();
  const hasShownAlert = useRef(false); // 🔒 Anti-double popup

  useEffect(() => {
    if (hasShownAlert.current) return;
    hasShownAlert.current = true;

    setTimeout(() => {
      Swal.fire({
        icon: 'error',
        title: 'Transaction annulée ❌',
        text: 'Retour à la boutique dans un instant...',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#fff0f0',
        color: '#1a202c',
        didClose: () => {
          navigate('/shop');
        }
      });
    }, 100);
  }, [navigate]);

  return null;
};

export default Cancel;

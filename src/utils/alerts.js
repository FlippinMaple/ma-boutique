import toast from 'react-hot-toast';

export const showAddToCartToast = () => {
  toast.success('Ajouté au panier !', {
    duration: 1500,
    style: {
      background: '#e6fffa',
      color: '#1a202c'
    },
    position: 'top-right'
  });
};

// Conservée pour refonte future — à ne pas utiliser pour le moment
export const showImageZoom = () => {
  console.warn('showImageZoom est toujours en Swal et sera revu plus tard.');
};

export const showCheckoutConfirm = async () => {
  return window.confirm('Veux-tu vraiment passer à la caisse ?');
};

export const showCheckoutError = () => {
  toast.error('Impossible de démarrer la session de paiement.', {
    style: {
      background: '#fff0f0',
      color: '#990000'
    }
  });
};

export const showEmptyCartAlert = () => {
  toast('T’as tout vidé! 🧹 Il reste plus rien ici.', {
    icon: '🛒',
    duration: 2500,
    style: {
      background: '#fffbe6',
      color: '#333'
    }
  });
};

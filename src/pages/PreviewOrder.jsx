import { useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../CartContext';

const PreviewOrder = () => {
  const { cartItems } = useCart();
  const userEmail = 'client@example.com'; // remplace ça par l'email réel si disponible

  useEffect(() => {
    const timer = setTimeout(() => {
      if (cartItems.length > 0 && userEmail) {
        axios.post('http://localhost:4242/api/log-abandoned-cart', {
          customer_email: userEmail,
          cart_contents: JSON.stringify(cartItems)
        });
      }
    }, 60000); // 1 minute d'inactivité

    return () => clearTimeout(timer);
  }, [cartItems]);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Aperçu de la commande (à venir)</h2>
      {/* Le contenu du panier viendra ici */}
    </div>
  );
};

export default PreviewOrder;

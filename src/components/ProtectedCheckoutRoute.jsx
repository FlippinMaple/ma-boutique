import { Navigate } from 'react-router-dom';
import { useCart } from '../CartContext';

const ProtectedCheckoutRoute = ({ children }) => {
  const { cart } = useCart();

  if (!Array.isArray(cart) || cart.length === 0) {
    return <Navigate to="/shop" replace />;
  }

  return children;
};

export default ProtectedCheckoutRoute;

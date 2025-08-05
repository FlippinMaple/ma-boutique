import { Link } from 'react-router-dom';
import { useCart } from '../CartContext';
import { useEffect, useRef, useState } from 'react';
import './styles/Header.css';

const Header = () => {
  const { cart } = useCart();
  const totalQuantity = Array.isArray(cart)
    ? cart.reduce((acc, item) => acc + item.quantity, 0)
    : 0;

  const badgeRef = useRef(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!badgeRef.current || totalQuantity === 0) return;

    setAnimate(true);

    const timer = setTimeout(() => setAnimate(false), 300);
    return () => clearTimeout(timer);
  }, [totalQuantity]);

  return (
    <header className="header">
      <Link to="/" className="nav-link">
        Accueil
      </Link>
      <Link to="/shop" className="nav-link">
        Boutique
      </Link>

      <Link to="/checkout" className="nav-link">
        🛒
        {totalQuantity > 0 && (
          <span
            ref={badgeRef}
            className={`cart-badge ${animate ? 'bump' : ''}`}
          >
            {totalQuantity}
          </span>
        )}
      </Link>
      <li>
        <Link to="/register">Créer un compte</Link>
      </li>
    </header>
  );
};

export default Header;

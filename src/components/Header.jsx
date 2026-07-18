// src/components/Header.jsx
import { Link } from 'react-router-dom';
import { useCart } from '../CartContext';
import { useEffect, useRef, useState } from 'react';
import './styles/Header.css';

export default function Header({ isAuthenticated, onLogout, userRole }) {
  const { cart } = useCart();
  const totalQuantity = Array.isArray(cart)
    ? cart.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0)
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
      <nav className="nav">
        <div className="nav-left">
          <Link to="/" className="nav-link">
            Accueil
          </Link>
          <Link to="/shop" className="nav-link">
            Boutique
          </Link>

          {isAuthenticated && userRole === 'admin' && (
            <Link to="/admin" className="nav-link">
              Admin
            </Link>
          )}
        </div>

        <div className="nav-right">
          <Link to="/checkout" className="nav-link cart-link">
            Panier
            {totalQuantity > 0 && (
              <span
                ref={badgeRef}
                className={`cart-badge ${animate ? 'bump' : ''}`}
                aria-label={`${totalQuantity} article(s) dans le panier`}
              >
                {totalQuantity}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">
                Mon compte
              </Link>
              <button type="button" onClick={onLogout} className="logout-btn">
                Deconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Connexion
              </Link>
              <Link to="/register" className="nav-link">
                Creer un compte
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

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
    <header className="site-header">
      <div className="site-header__inner">
        <Link
          to="/"
          className="site-header__brand"
          aria-label="Flippin’ Maple — Accueil"
        >
          FLIPPIN’ MAPLE
        </Link>

        <nav
          className="site-header__primary"
          aria-label="Navigation principale"
        >
          <Link to="/shop" className="site-header__link">
            Boutique
          </Link>

          {isAuthenticated && userRole === 'admin' && (
            <Link to="/admin" className="site-header__link">
              Admin
            </Link>
          )}
        </nav>

        <nav
          className="site-header__utility"
          aria-label="Navigation utilitaire"
        >
          <Link
            to="/checkout"
            className="site-header__link site-header__cart"
          >
            Panier
            {totalQuantity > 0 && (
              <span
                ref={badgeRef}
                className={`site-header__cart-badge ${animate ? 'bump' : ''}`}
                aria-label={`${totalQuantity} article(s) dans le panier`}
              >
                {totalQuantity}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="site-header__link">
                Mon compte
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="site-header__logout"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="site-header__link">
                Connexion
              </Link>
              <Link to="/register" className="site-header__link">
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

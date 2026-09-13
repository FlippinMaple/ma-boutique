// src/components/Header.jsx
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../CartContext';
import { useEffect, useId, useRef, useState } from 'react';
import wordmarkBlack from '../assets/brand/wordmark-black.svg';
import compactFmBlack from '../assets/brand/compact-fm-black.svg';
import './styles/Header.css';

export default function Header({ isAuthenticated, onLogout, userRole }) {
  const { cart } = useCart();
  const { pathname } = useLocation();
  const totalQuantity = Array.isArray(cart)
    ? cart.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0)
    : 0;

  const badgeRef = useRef(null);
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const [animate, setAnimate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId().replace(/:/g, '');
  const panelId = `site-header-menu-${menuId}`;

  useEffect(() => {
    if (!badgeRef.current || totalQuantity === 0) return;
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 300);
    return () => clearTimeout(timer);
  }, [totalQuantity]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 48rem)');
    const onChange = (event) => {
      if (event.matches) setMenuOpen(false);
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const getFocusable = () =>
      Array.from(menuRef.current?.querySelectorAll('a, button') ?? []).filter(
        (el) => !el.disabled && el.getAttribute('aria-hidden') !== 'true'
      );

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const atFirst = active === first;
      const atLast = active === last;

      if (event.shiftKey && atFirst) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && atLast) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const firstLink = menuRef.current?.querySelector('a, button');
    firstLink?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const cartLabel =
    totalQuantity === 1
      ? 'Panier, 1 article'
      : totalQuantity > 1
        ? `Panier, ${totalQuantity} articles`
        : 'Panier';

  const closeMenu = () => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    <header className={`site-header${menuOpen ? ' is-open' : ''}`}>
      <div className="site-header__inner">
        <Link
          to="/"
          className="site-header__brand"
          aria-label="Flippin’ Maple — Accueil"
        >
          <img
            className="site-header__wordmark"
            src={wordmarkBlack}
            alt=""
            aria-hidden="true"
          />
          <img
            className="site-header__compact"
            src={compactFmBlack}
            alt=""
            aria-hidden="true"
          />
        </Link>

        <nav
          className="site-header__primary"
          aria-label="Navigation principale"
        >
          <NavLink to="/shop" className="site-header__link">
            Boutique
          </NavLink>

          {isAuthenticated && userRole === 'admin' && (
            <NavLink to="/admin" className="site-header__link">
              Admin
            </NavLink>
          )}
        </nav>

        <Link
          to="/checkout"
          className="site-header__link site-header__cart"
          aria-label={cartLabel}
        >
          Panier
          {totalQuantity > 0 && (
            <span
              ref={badgeRef}
              className={`site-header__cart-badge ${animate ? 'bump' : ''}`}
              aria-hidden="true"
            >
              {totalQuantity}
            </span>
          )}
        </Link>

        <nav
          className="site-header__utility"
          aria-label="Navigation utilitaire"
        >
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className="site-header__link">
                Mon compte
              </NavLink>
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
              <NavLink to="/login" className="site-header__link">
                Connexion
              </NavLink>
              <NavLink to="/register" className="site-header__link">
                Créer un compte
              </NavLink>
            </>
          )}
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          className="site-header__menu-toggle"
          aria-expanded={menuOpen}
          aria-controls={panelId}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="site-header__menu-icon" aria-hidden="true" />
        </button>
      </div>

      {menuOpen ? (
        <div
          className="site-header__backdrop"
          aria-hidden="true"
          onClick={closeMenu}
        />
      ) : null}

      <div
        ref={menuRef}
        id={panelId}
        className="site-header__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!menuOpen}
      >
        <nav className="site-header__panel-nav" aria-label="Menu mobile">
          <NavLink
            to="/shop"
            className="site-header__panel-link"
            onClick={closeMenu}
          >
            Boutique
          </NavLink>
          {isAuthenticated && userRole === 'admin' && (
            <NavLink
              to="/admin"
              className="site-header__panel-link"
              onClick={closeMenu}
            >
              Admin
            </NavLink>
          )}
          {isAuthenticated ? (
            <>
              <NavLink
                to="/dashboard"
                className="site-header__panel-link"
                onClick={closeMenu}
              >
                Mon compte
              </NavLink>
              <button
                type="button"
                className="site-header__panel-logout"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className="site-header__panel-link"
                onClick={closeMenu}
              >
                Connexion
              </NavLink>
              <NavLink
                to="/register"
                className="site-header__panel-link"
                onClick={closeMenu}
              >
                Créer un compte
              </NavLink>
            </>
          )}
        </nav>
        <button
          type="button"
          className="site-header__panel-close"
          onClick={closeMenu}
        >
          Fermer
        </button>
      </div>
    </header>
  );
}

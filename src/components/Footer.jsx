// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import wordmarkWhite from '../assets/brand/wordmark-white.svg';
import './styles/Footer.css';

export default function Footer({ isAuthenticated }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Link
            to="/"
            className="site-footer__wordmark"
            aria-label="Flippin’ Maple — Accueil"
          >
            <img
              className="site-footer__wordmark-image"
              src={wordmarkWhite}
              alt=""
            />
          </Link>
        </div>

        <nav className="site-footer__nav" aria-label="Pied de page">
          <Link to="/" className="site-footer__link">
            Accueil
          </Link>
          <Link to="/shop" className="site-footer__link">
            Boutique
          </Link>
          <Link to="/checkout" className="site-footer__link">
            Panier
          </Link>
          {isAuthenticated ? (
            <Link to="/dashboard" className="site-footer__link">
              Mon compte
            </Link>
          ) : (
            <Link to="/login" className="site-footer__link">
              Connexion
            </Link>
          )}
        </nav>

        <p className="site-footer__legal">© 2026 Flippin’ Maple</p>
      </div>
    </footer>
  );
}

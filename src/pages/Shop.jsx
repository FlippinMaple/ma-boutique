import { useRef, useEffect, useState } from 'react';
import api from '../utils/api';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // ✅ AJOUT
import './styles/Shop.css';

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const flashShownRef = useRef(false); // 🔒 bloque un second tir en dev

  const highlightId = new URLSearchParams(location.search).get('highlight');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ Affiche le toast "Merci" si présent, puis nettoie l'URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const flash = params.get('flash');

    if (flash === 'merci' && !flashShownRef.current) {
      flashShownRef.current = true;
      toast.success('🎉 Merci pour ton achat !', { id: 'purchase-thanks' }); // ✅ id fixe

      params.delete('flash');
      navigate(
        {
          pathname: location.pathname,
          search: params.toString() ? `?${params.toString()}` : ''
        },
        { replace: true }
      );
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/api/products', {
          params: search ? { q: search } : {}
        });
        setProducts(res.data);
      } catch (err) {
        console.error('❌ Erreur axios :', err);
      }
    };
    fetchProducts();
  }, [search]);

  useEffect(() => {
    if (highlightId) {
      const el = document.getElementById(`product-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '2px solid #38bdf8';
      }
    }
  }, [products, highlightId]);

  useEffect(() => {
    if (previewImage && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [previewImage, isMobile]);

  const handleOverlayLeave = (e) => {
    const related = e.relatedTarget;
    if (
      related &&
      (related.classList?.contains('shop-card') ||
        related.classList?.contains('shop-image'))
    ) {
      return;
    }
    setPreviewImage(null);
    setPreviewLoaded(false);
  };

  useEffect(() => {
    if (highlightId && !products.some((p) => p.id === Number(highlightId))) {
      const url = new URL(window.location.href);
      url.searchParams.delete('highlight');
      window.history.replaceState({}, '', url);
    }
  }, [products, highlightId]);

  return (
    <div className="shop-container">
      <h1>Ma boutique</h1>
      <Link
        to="/preview-order"
        className="shop-btn btn-details"
        style={{ marginBottom: '1rem', display: 'inline-block' }}
      >
        🧾 Aperçu de la commande
      </Link>
      <input
        type="text"
        placeholder="Rechercher un produit..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="shop-search"
      />

      <div className="shop-grid">
        {products.map((product) => {
          const firstVariant = product.variants?.[0];
          return (
            <div
              key={product.id}
              id={`product-${product.id}`}
              className="shop-card"
            >
              <div className="shop-image-wrapper">
                <img
                  src={firstVariant?.image || product.image}
                  alt={product.name}
                  className={`shop-image ${!isMobile ? 'zoomable' : ''}`}
                  onMouseEnter={() => {
                    if (!isMobile) {
                      setPreviewImage(firstVariant?.image || product.image);
                      setPreviewLoaded(false);
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) {
                      const related = e.relatedTarget;
                      if (
                        related &&
                        (related.classList?.contains('image-preview') ||
                          related.classList?.contains('image-preview-overlay'))
                      ) {
                        return;
                      }
                      setPreviewImage(null);
                      setPreviewLoaded(false);
                    }
                  }}
                  onClick={() => {
                    if (isMobile) {
                      setPreviewImage(firstVariant?.image || product.image);
                      setPreviewLoaded(true);
                    }
                  }}
                />
              </div>
              <h3 className="shop-title">{product.name}</h3>

              <p style={{ margin: '4px 0', fontWeight: 'bold' }}>
                {firstVariant?.price
                  ? `${Number(firstVariant.price).toFixed(2)} $`
                  : 'Prix non dispo'}
              </p>

              <Link
                to={`/product/${product.id}`}
                onClick={(e) => e.stopPropagation()}
                className="shop-btn btn-details"
              >
                🔍 Détails
              </Link>
            </div>
          );
        })}
      </div>

      {previewImage && !isMobile && (
        <div
          className="image-preview-overlay"
          onMouseLeave={handleOverlayLeave}
          onMouseEnter={() => setPreviewLoaded(true)}
          style={{
            opacity: previewLoaded ? 1 : 0,
            visibility: previewLoaded ? 'visible' : 'hidden'
          }}
        >
          <img
            src={previewImage}
            alt="Zoom"
            className="image-preview"
            onLoad={() => setPreviewLoaded(true)}
          />
        </div>
      )}

      {previewImage && isMobile && (
        <div className="image-preview-overlay image-preview-blur">
          <button
            className="close-button"
            onClick={() => setPreviewImage(null)}
          >
            ✕
          </button>
          <img src={previewImage} alt="Zoom" className="image-preview" />
        </div>
      )}
    </div>
  );
};

export default Shop;

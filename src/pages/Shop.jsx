import { useRef, useEffect, useState } from 'react';
import api from '../utils/api';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // ✅ AJOUT
import './styles/Shop.css';

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSubmittedSearch(searchInput.trim());
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products', {
          params: submittedSearch ? { q: submittedSearch } : {}
        });
        setProducts(res.data);
      } catch (err) {
        console.error('❌ Erreur axios :', err);
      }
    };

    fetchProducts();
  }, [submittedSearch]);

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
    <main className="shop-page" id="main-content">
      <section className="shop-intro" aria-labelledby="shop-title">
        <div className="shop-intro__inner">
          <p className="shop-intro__eyebrow">FLIPPIN’ MAPLE</p>
          <h1 id="shop-title" className="shop-intro__title">
            Boutique
          </h1>
          <p className="shop-intro__copy">
            Une sélection de vêtements et d’objets conçus pour avancer sans ligne imposée.
          </p>

          <form className="shop-search" onSubmit={handleSearchSubmit}>
            <label htmlFor="shop-search-input" className="shop-search__label">
              Rechercher
            </label>
            <input
              id="shop-search-input"
              type="search"
              placeholder="Nom ou description du produit"
              value={searchInput}
              onChange={(e) => {
              const value = e.target.value;
              setSearchInput(value);

              if (value === '') {
                setSubmittedSearch('');
              }
            }}
              maxLength={100}
              className="shop-search__input"
            />
          </form>
        </div>
      </section>

      <section className="shop-catalogue" aria-labelledby="shop-catalogue-title">
        <div className="shop-catalogue__inner">
          <div className="shop-catalogue__header">
            <h2 id="shop-catalogue-title" className="shop-catalogue__title">
              Produits
            </h2>
            <p className="shop-catalogue__count">
              {products.length} {products.length === 1 ? 'produit' : 'produits'}
            </p>
          </div>

          {products.length === 0 ? (
            <p className="shop-empty">
              Aucun produit ne correspond à ta recherche.
            </p>
          ) : (
            <div className="shop-grid">
              {products.map((product) => {
                const firstVariant = product.variants?.[0];
                const productImage = firstVariant?.image || product.image;
                const rawPrice = firstVariant?.price;
                const priceNumber = Number(rawPrice);
                const hasPrice =
                  rawPrice != null &&
                  rawPrice !== '' &&
                  Number.isFinite(priceNumber);

                return (
                  <article
                    key={product.id}
                    id={`product-${product.id}`}
                    className="shop-card"
                  >
                    <div className="shop-image-wrapper">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className={`shop-image ${!isMobile ? 'zoomable' : ''}`}
                          onMouseEnter={() => {
                            if (!isMobile) {
                              setPreviewImage(productImage);
                              setPreviewLoaded(false);
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isMobile) {
                              const related = e.relatedTarget;
                              if (
                                related &&
                                (related.classList?.contains('image-preview') ||
                                  related.classList?.contains(
                                    'image-preview-overlay'
                                  ))
                              ) {
                                return;
                              }
                              setPreviewImage(null);
                              setPreviewLoaded(false);
                            }
                          }}
                          onClick={() => {
                            if (isMobile) {
                              setPreviewImage(productImage);
                              setPreviewLoaded(true);
                            }
                          }}
                        />
                      ) : (
                        <div
                          className="shop-image-fallback"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="shop-card__body">
                      <h3 className="shop-title">{product.name}</h3>

                      {hasPrice ? (
                        <p className="shop-price">
                          {new Intl.NumberFormat('fr-CA', {
                            style: 'currency',
                            currency: 'CAD',
                          }).format(priceNumber)}
                        </p>
                      ) : null}

                      <Link
                        to={`/product/${product.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="shop-details-link"
                      >
                        Voir le produit
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

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
            alt=""
            className="image-preview"
            onLoad={() => setPreviewLoaded(true)}
          />
        </div>
      )}

      {previewImage && isMobile && (
        <div className="image-preview-overlay image-preview-blur">
          <button
            type="button"
            className="close-button"
            aria-label="Fermer l’aperçu"
            onClick={() => setPreviewImage(null)}
          >
            ✕
          </button>
          <img src={previewImage} alt="" className="image-preview" />
        </div>
      )}
    </main>
  );
};

export default Shop;

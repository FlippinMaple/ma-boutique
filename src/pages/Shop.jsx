import { useRef, useEffect, useState } from 'react';
import api from '../utils/api';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // ✅ AJOUT
import { Search } from 'lucide-react';
import './styles/Shop.css';

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const flashShownRef = useRef(false); // 🔒 bloque un second tir en dev

  const highlightId = new URLSearchParams(location.search).get('highlight');

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
    const nextSearch = searchInput.trim();
    setSubmittedSearch(nextSearch);
    if (nextSearch) {
      setSort('relevance');
    } else {
      setSort('newest');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await api.get('/products', {
          params: {
            ...(submittedSearch ? { q: submittedSearch } : {}),
            sort
          }
        });

        if (!cancelled) {
          setProducts(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('❌ Erreur axios :', err);
          setError('Impossible de charger les produits pour le moment.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasLoadedOnce(true);
        }
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [submittedSearch, sort]);

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
    if (!loading && highlightId && !products.some((p) => p.id === Number(highlightId))) {
      const url = new URL(window.location.href);
      url.searchParams.delete('highlight');
      window.history.replaceState({}, '', url);
    }
  }, [products, highlightId, loading]);

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
            <div className="shop-search__control">
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
                    setSort('newest');
                  }
                }}
                maxLength={100}
                className="shop-search__input"
              />
              <button
                type="submit"
                className="shop-search__submit"
                aria-label="Rechercher"
              >
                <Search size={20} aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="shop-catalogue" aria-labelledby="shop-catalogue-title" aria-busy={loading}>
        <div className="shop-catalogue__inner">
          <div className="shop-catalogue__header">
            <h2 id="shop-catalogue-title" className="shop-catalogue__title">
              Produits
            </h2>
            <div className="shop-catalogue__controls">
              <p className="shop-catalogue__count">
                {loading
                  ? 'Chargement…'
                  : `${products.length} ${products.length === 1 ? 'produit' : 'produits'}`}
              </p>
              <label className="shop-sort">
                <span className="shop-sort__label">Trier par</span>
                <select
                  className="shop-sort__select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="relevance">Pertinence</option>
                  <option value="price_asc">Prix : du plus bas au plus élevé</option>
                  <option value="price_desc">Prix : du plus élevé au plus bas</option>
                  <option value="newest">Plus récents</option>
                  <option value="name_asc">Nom : A à Z</option>
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <p className="shop-status" role="status" aria-live="polite">
              {hasLoadedOnce
                ? 'Mise à jour des produits…'
                : 'Chargement des produits…'}
            </p>
          ) : error ? (
            <p className="shop-status shop-status--error" role="alert">
              {error}
            </p>
          ) : products.length === 0 ? (
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
                        <Link
                          to={`/product/${product.id}`}
                          className="shop-image-link"
                          aria-label={`Voir ${product.name}`}
                        >
                          <img
                            src={productImage}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            className="shop-image"
                          />
                        </Link>
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
    </main>
  );
};

export default Shop;

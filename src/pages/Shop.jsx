import { useEffect, useState } from 'react';
import axios from 'axios';
import { useCart } from '../CartContext';
import { useLocation, Link } from 'react-router-dom';
import { showAddToCartToast } from '../utils/alerts';
import './styles/Shop.css';

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { addToCart, removeFromCart, cartItems } = useCart();
  const location = useLocation();

  const highlightId = new URLSearchParams(location.search).get('highlight');

  // 🔄 Gestion responsive de isMobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🔍 Loupe (desktop seulement)
  useEffect(() => {
    if (isMobile) return;

    const preview = document.createElement('div');
    preview.className = 'zoom-preview';
    document.body.appendChild(preview);

    const handleMouseEnter = (e) => {
      const src = e.target.getAttribute('src');
      preview.innerHTML = `<img src="${src}" alt="Zoom" />`;
      preview.classList.add('show');
    };

    const handleMouseLeave = () => {
      preview.classList.remove('show');
    };

    const images = document.querySelectorAll('.shop-image.zoomable');
    images.forEach((img) => {
      img.addEventListener('mouseenter', handleMouseEnter);
      img.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      images.forEach((img) => {
        img.removeEventListener('mouseenter', handleMouseEnter);
        img.removeEventListener('mouseleave', handleMouseLeave);
      });
      document.body.removeChild(preview);
    };
  }, [isMobile]);

  // 🛍️ Chargement des produits
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(
          'http://localhost:4242/store/full-products',
          {
            params: search ? { q: search } : {}
          }
        );
        setProducts(res.data.result);
      } catch (err) {
        console.error('Erreur de chargement :', err);
      }
    };
    fetchProducts();
  }, [search]);

  // ✨ Highlight du produit
  useEffect(() => {
    if (highlightId) {
      const el = document.getElementById(`product-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '2px solid #38bdf8';
      }
    }
  }, [products, highlightId]);

  return (
    <div className="shop-container">
      <h1>Ma boutique</h1>

      <input
        type="text"
        placeholder="Rechercher un produit..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="shop-search"
      />

      <div className="shop-grid">
        {products.map((product) => {
          const itemInCart = cartItems.find((item) => item.id === product.id);

          return (
            <div
              key={product.id}
              id={`product-${product.id}`}
              className="shop-card"
            >
              <div className="shop-image-wrapper">
                <img
                  src={product.image}
                  alt={product.name}
                  className={`shop-image ${!isMobile ? 'zoomable' : ''}`}
                />
              </div>
              <h3 className="shop-title">{product.name}</h3>
              <p className="shop-price">{product.price.toFixed(2)} $</p>

              {!itemInCart ? (
                <button
                  className="shop-btn btn-add"
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                      quantity: 1
                    });
                    showAddToCartToast();
                  }}
                >
                  ➕ Ajouter au panier
                </button>
              ) : (
                <div className="shop-quantity-controls">
                  <button
                    className="shop-qty-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromCart(product.id);
                    }}
                  >
                    ➖
                  </button>
                  <span className="shop-qty-count">{itemInCart.quantity}</span>
                  <button
                    className="shop-qty-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image: product.image,
                        quantity: 1
                      });
                      showAddToCartToast();
                    }}
                  >
                    ➕
                  </button>
                </div>
              )}

              <Link
                to={`/product/${product.id}`}
                onClick={(e) => e.stopPropagation()}
                className="shop-btn btn-details"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="white"
                  viewBox="0 0 16 16"
                >
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.397l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                </svg>
                Détails
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Shop;

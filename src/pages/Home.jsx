import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import HomeProductCard from '../components/HomeProductCard';
import './Home.css';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get('/products/featured');
        if (cancelled) return;

        const list = Array.isArray(data) ? data : [];
        const valid = list
          .filter(
            (product) =>
              product != null &&
              product.id !== undefined &&
              product.id !== null &&
              typeof product.name === 'string' &&
              product.name.trim() !== ''
          )
          .slice(0, 4);

        setFeaturedProducts(valid);
      } catch (error) {
        console.error(
          'Erreur lors du chargement des produits vedettes :',
          error
        );

        if (!cancelled) {
          setFeaturedProducts([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="home" id="main-content">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero__inner">
          <div className="home-hero__content">
            <p className="home-hero__eyebrow">FLIPPIN’ MAPLE</p>
            <h1 id="home-hero-title" className="home-hero__title">
              NO FIXED LINE.
            </h1>
            <p className="home-hero__copy">
              Une marque canadienne indépendante. Le skate comme point de
              départ, pas comme limite.
            </p>
            <Link className="home-hero__cta" to="/shop">
              Voir la boutique
            </Link>
          </div>
          <div className="home-hero__visual" aria-hidden="true" />
        </div>
      </section>

      {featuredProducts.length > 0 ? (
        <section
          className="home-products"
          aria-labelledby="home-products-title"
        >
          <div className="home-products__inner">
            <header className="home-products__header">
              <h2 id="home-products-title" className="home-products__title">
                Sélection
              </h2>
              <Link className="home-products__shop-link" to="/shop">
                Voir la boutique
              </Link>
            </header>
            <div className="home-products__grid">
              {featuredProducts.map((product) => (
                <HomeProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section
        className="home-declaration"
        aria-labelledby="home-declaration-title"
      >
        <div className="home-declaration__inner">
          <h2
            id="home-declaration-title"
            className="home-declaration__title"
          >
            Ta ligne. Ton rythme.
          </h2>
          <p className="home-declaration__copy">
            Flippin’ Maple puise dans la culture skate une idée simple : choisir
            sa direction. Mouvement, liberté et confiance calme guident la
            marque, sans t’enfermer dans une scène. Tu avances à ton rythme. Tu
            changes de direction quand tu le décides.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Home;

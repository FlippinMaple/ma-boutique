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
          {/*
            PLACEHOLDER ACTIF — HERO CAMPAGNE

            Rôle :
            installer immédiatement l’univers Flippin’ Maple.

            Sujet :
            une ou deux personnes adultes portant les vêtements dans un
            environnement urbain canadien froid.

            Cadrage desktop :
            horizontal, environ 3:2 ou 16:9, sujet plutôt côté droit.

            Cadrage mobile :
            4:5 distinct ou safe area centrale.

            Style :
            documentaire / éditorial / mature / mouvement naturel.

            Matières :
            béton, asphalte, métal, bois clair.

            Palette :
            charbon, noir, Bone, gris froid, Deep Forest discret.

            Format final :
            AVIF ou WebP.

            Résolution cible desktop :
            minimum 2400 × 1350.

            Résolution cible mobile :
            minimum 1600 × 2000 si fichier séparé.

            Interdits :
            feuille d’érable visible ; chalet ; pose de skate caricaturale ;
            néon ; saturation excessive ; marque concurrente ; texte incrusté.

            Responsive :
            object-fit cover avec cadrage mobile validé séparément.

            Intention :
            culture skate comme origine, pas comme cliché sportif.

            Repli actuel :
            aplat Deep Forest / Charcoal. Aucune photo, aucun alt inventé.
          */}
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

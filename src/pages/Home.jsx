import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import HomeProductCard from '../components/HomeProductCard';
import brandHeroMontreal from '../assets/campaign/brand-hero-montreal.png';
import brandHeroMontrealMobile from '../assets/campaign/brand-hero-montreal-mobile.png';
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
            BRAND-HERO — actifs de travail intégrés :
            Desktop / tablette :
            src/assets/campaign/brand-hero-montreal.png (~16:9, horizontal, approuvé)
            Mobile <= 39.99rem :
            src/assets/campaign/brand-hero-montreal-mobile.png (4:5, portrait, approuvé)
            Adults (two), lifestyle, worn clothing, snowy Montréal street.
            Cold urban Canadian environment; natural movement;
            discreet skate influence (board present, not a trick shot).
            Overcast / covered light; wall/tag at left, street at right.
            No other brands, no maple-leaf cliché, no embedded type.
            Desktop: centered editorial frame, full horizontal photograph.
            Mobile: full 4:5 portrait, editorial panel overlaid on the wall.
            No artificial mobile crop of the landscape file.
          */}
          <div className="home-hero__visual">
            <picture className="home-hero__picture">
              <source
                media="(max-width: 39.99rem)"
                srcSet={brandHeroMontrealMobile}
                width={1122}
                height={1402}
              />
              <img
                className="home-hero__image"
                src={brandHeroMontreal}
                width={1672}
                height={941}
                alt="Deux adultes dans une rue enneigée de Montréal avec un skateboard Flippin’ Maple."
                fetchPriority="high"
              />
            </picture>
          </div>
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

      {/*
        BRAND-MATERIAL / BRAND-SKATE — section masquée (aucun actif réel).
        Réintroduire le bloc public `.home-editorial` uniquement lorsqu’une
        vraie photographie de campagne sera produite.

        Future public asset: BRAND-MATERIAL / BRAND-SKATE
        One editorial still — not two bands.
        Matter (concrete, asphalt, weathered maple, textile)
        and discreet skate culture in a cold urban field.
        Adult presence optional; movement natural, not caricature.
        Charcoal / Deep Forest; overcast light; negative space.
        No heritage fiction, no factory scene, no competing marks.
        Desktop: full-bleed landscape, ~21:9 or 16:9 crop.
        Mobile: contained height, ~4:5 or 3:2, not a second hero.
        Replace this graphic field without rebuilding the layout.
      */}

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

      <section
        className="home-shop-entry"
        aria-labelledby="home-shop-entry-title"
      >
        <div className="home-shop-entry__inner">
          <div className="home-shop-entry__copy">
            <h2
              id="home-shop-entry-title"
              className="home-shop-entry__title"
            >
              La boutique
            </h2>
            <p className="home-shop-entry__text">
              Parcourir les pièces actuellement disponibles.
            </p>
          </div>
          <Link className="home-shop-entry__cta" to="/shop">
            Voir la boutique
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Home;

import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
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
    </main>
  );
};

export default Home;

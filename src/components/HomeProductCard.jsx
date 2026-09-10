import { Link } from 'react-router-dom';

const HomeProductCard = ({ product }) => {
  const firstVariant = product?.variants?.[0];
  const image = firstVariant?.image || product?.image;
  const rawPrice = firstVariant?.price;
  const numericPrice = Number(rawPrice);

  const productId = product?.id;
  const name = product?.name;

  if (productId === undefined || productId === null || !name) {
    return null;
  }

  const hasValidPrice =
    rawPrice !== undefined &&
    rawPrice !== null &&
    rawPrice !== '' &&
    Number.isFinite(numericPrice);

  const formattedPrice = hasValidPrice
    ? new Intl.NumberFormat('fr-CA', {
        style: 'currency',
        currency: 'CAD'
      }).format(numericPrice)
    : null;

  return (
    <article className="home-product-card">
      <Link
        className="home-product-card__link"
        to={`/product/${productId}`}
      >
        <div className="home-product-card__media">
          {image ? (
            <img
              className="home-product-card__image"
              src={image}
              alt={name}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <>
              {/*
                PLACEHOLDER ACTIF — PHOTOGRAPHIE PRODUIT

                Rôle :
                présenter les pièces avec cohérence.

                Sujet :
                produit porté ; adulte ; posture naturelle ; vêtement lisible.

                Ratio :
                4:5.

                Résolution :
                minimum 1600 × 2000.

                Format :
                AVIF / WebP.

                Direction :
                lumière cohérente ;
                fond Maple Bone / gris clair ou environnement commun ;
                même échelle entre produits ;
                pas de mélange brutal photo éditoriale / mockup POD.

                Responsive :
                image complète, object-fit cover contrôlé.

                Intention :
                faire percevoir une marque de vêtements, pas un catalogue Printful.
              */}
              <div
                className="home-product-card__image-fallback"
                aria-hidden="true"
              />
            </>
          )}
        </div>

        <div className="home-product-card__body">
          <h3 className="home-product-card__title">{name}</h3>

          {formattedPrice ? (
            <p className="home-product-card__price">{formattedPrice}</p>
          ) : null}
        </div>
      </Link>
    </article>
  );
};

export default HomeProductCard;

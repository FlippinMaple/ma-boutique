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
            <div
              className="home-product-card__image-fallback"
              aria-hidden="true"
            />
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

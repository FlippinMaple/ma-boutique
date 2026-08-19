import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../CartContext';
import api from '../utils/api';
import './styles/ProductDetail.css';

const MAX_QUANTITY_PER_LINE = 20;

const ProductDetail = () => {
  const { id } = useParams();
  const { validateStockBeforeAdd } = useCart(); // ✅ utilise validateStockBeforeAdd
  const [product, setProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isAvailable, setIsAvailable] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/details/${id}`);
        const productData = res.data;
        setProduct(productData);

        const variants = productData.variants || [];
        if (variants.length > 0) {
          const first = variants.find((v) => v.color && v.size);
          if (first) {
            setSelectedColor(first.color);
            setSelectedSize(first.size);
            setSelectedVariant(first);
          }
        }
      } catch (err) {
        console.error('❌ Erreur chargement produit:', err);
        setProduct(null);
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const variant = (product.variants || []).find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );
    setSelectedVariant(variant || null);
  }, [product, selectedColor, selectedSize]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (selectedVariant?.printful_variant_id) {
        setLoading(true);
        setIsAvailable(null);
        try {
          const res = await api.get(
            `/inventory/printful-stock/${selectedVariant.printful_variant_id}`
          );
          setIsAvailable(res.data.available === true);
        } catch {
          setIsAvailable(false);
        }
        setLoading(false);
      } else {
        setIsAvailable(false);
      }
    };
    fetchAvailability();
  }, [selectedVariant]);

  if (!product) {
    return (
      <main className="product-page" id="main-content">
        <div className="product-page__state" role="status">
          Chargement du produit...
        </div>
      </main>
    );
  }

  const colors = [
    ...new Set((product.variants || []).map((v) => v.color).filter(Boolean))
  ];
  const sizes = [
    ...new Set((product.variants || []).map((v) => v.size).filter(Boolean))
  ];

  const canAddToCart =
    !!selectedVariant &&
    isAvailable === true &&
    !loading &&
    quantity >= 1 &&
    quantity <= MAX_QUANTITY_PER_LINE;

  const productImage =
    selectedVariant?.image && selectedVariant.image !== ''
      ? selectedVariant.image
      : product.image;

  const rawPrice = selectedVariant?.price;
  const numericPrice = Number(rawPrice);
  const formattedPrice =
    rawPrice !== undefined &&
    rawPrice !== null &&
    rawPrice !== '' &&
    Number.isFinite(numericPrice)
      ? new Intl.NumberFormat('fr-CA', {
          style: 'currency',
          currency: 'CAD'
        }).format(numericPrice)
      : null;

  const stockStatusClass =
    loading || isAvailable === null
      ? 'product-stock product-stock--checking'
      : isAvailable === true
        ? 'product-stock product-stock--available'
        : 'product-stock product-stock--unavailable';

  return (
    <main className="product-page" id="main-content">
      <div className="product-page__inner">
        <Link className="product-page__back" to="/shop">
          Retour à la boutique
        </Link>

        <article className="product-detail">
          <div className="product-detail__media">
            {productImage ? (
              <img
                src={productImage}
                alt={product.name}
                className="product-detail__image"
              />
            ) : (
              <div
                className="product-detail__image-fallback"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="product-detail__content">
            <p className="product-detail__eyebrow">FLIPPIN’ MAPLE</p>

            <h1 className="product-detail__title">{product.name}</h1>

            {formattedPrice ? (
              <p className="product-detail__price">{formattedPrice}</p>
            ) : null}

            {typeof product.description === 'string' &&
            product.description.trim() !== '' ? (
              <p className="product-detail__description">
                {product.description}
              </p>
            ) : null}

            <fieldset className="product-options">
              <legend className="product-options__legend">Couleur</legend>
              <div className="product-options__choices">
                {colors.map((color) => {
                  const isActive = selectedColor === color;

                  return (
                    <button
                      key={color}
                      type="button"
                      className={`product-option ${isActive ? 'is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => setSelectedColor(color)}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="product-options">
              <legend className="product-options__legend">Taille</legend>
              <div className="product-options__choices">
                {sizes.map((size) => {
                  const isActive = selectedSize === size;

                  return (
                    <button
                      key={size}
                      type="button"
                      className={`product-option ${isActive ? 'is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="product-purchase">
              <label className="product-quantity">
                <span className="product-quantity__label">Quantité</span>
                <input
                  type="number"
                  value={quantity}
                  min={1}
                  max={MAX_QUANTITY_PER_LINE}
                  onChange={(e) =>
                    setQuantity(
                      Math.max(
                        1,
                        Math.min(
                          Number(e.target.value) || 1,
                          MAX_QUANTITY_PER_LINE
                        )
                      )
                    )
                  }
                  className="product-quantity__input"
                  disabled={!selectedVariant}
                />
              </label>

              <p className={stockStatusClass} aria-live="polite">
                {loading || isAvailable === null
                  ? 'Vérification de la disponibilité...'
                  : isAvailable === true
                    ? 'Disponible'
                    : 'Indisponible'}
              </p>
            </div>

            <button
              type="button"
              className="product-add-button"
              onClick={() => {
                if (!selectedVariant) return;

                validateStockBeforeAdd({
                  id: selectedVariant.id,
                  name: product.name,
                  price: Number(selectedVariant.price),
                  image: selectedVariant.image || product.image,
                  quantity,
                  color: selectedVariant.color,
                  size: selectedVariant.size,
                  printful_variant_id: selectedVariant.printful_variant_id,
                  variant_id: selectedVariant.variant_id
                });
              }}
              disabled={!canAddToCart}
            >
              {loading
                ? 'Vérification...'
                : isAvailable === true
                  ? 'Ajouter au panier'
                  : 'Indisponible'}
            </button>
          </div>
        </article>
      </div>
    </main>
  );
};

export default ProductDetail;

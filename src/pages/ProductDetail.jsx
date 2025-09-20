import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../CartContext';
import api from '../utils/api';
import './styles/ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const { validateStockBeforeAdd } = useCart(); // ✅ utilise validateStockBeforeAdd
  const [product, setProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [availableStock, setAvailableStock] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/api/products/details/${id}`);
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
        try {
          const res = await api.get(
            `/api/printful-stock/${selectedVariant.printful_variant_id}`
          );
          const stock = res.data.available ?? 0;
          setAvailableStock(stock);
        } catch {
          setAvailableStock(0);
        }
        setLoading(false);
      } else {
        setAvailableStock(0);
      }
    };
    fetchAvailability();
  }, [selectedVariant]);

  if (!product) return <div>Chargement...</div>;

  const colors = [
    ...new Set((product.variants || []).map((v) => v.color).filter(Boolean))
  ];
  const sizes = [
    ...new Set((product.variants || []).map((v) => v.size).filter(Boolean))
  ];

  const canAddToCart =
    !!selectedVariant && availableStock >= quantity && quantity > 0;

  return (
    <div className="product-detail">
      <img
        src={
          selectedVariant?.image && selectedVariant.image !== ''
            ? selectedVariant.image
            : product.image
        }
        alt={product.name}
        style={{ maxWidth: 300, borderRadius: 10 }}
      />

      <h2>{product.name}</h2>
      <p>{product.description}</p>

      <div style={{ margin: '10px 0' }}>
        <span>Couleur :</span>
        {colors.map((color) => (
          <button
            key={color}
            className={`pastille ${selectedColor === color ? 'active' : ''}`}
            onClick={() => setSelectedColor(color)}
            style={{
              margin: 3,
              padding: 8,
              borderRadius: 16,
              border: '1px solid #ddd',
              background: selectedColor === color ? '#2196f3' : '#eee',
              color: selectedColor === color ? '#fff' : '#333',
              minWidth: 32
            }}
          >
            {color}
          </button>
        ))}
      </div>

      <div style={{ margin: '10px 0' }}>
        <span>Taille :</span>
        {sizes.map((size) => (
          <button
            key={size}
            className={`pastille ${selectedSize === size ? 'active' : ''}`}
            onClick={() => setSelectedSize(size)}
            style={{
              margin: 3,
              padding: 8,
              borderRadius: 16,
              border: '1px solid #ddd',
              background: selectedSize === size ? '#2196f3' : '#eee',
              color: selectedSize === size ? '#fff' : '#333',
              minWidth: 32
            }}
          >
            {size}
          </button>
        ))}
      </div>

      <div style={{ margin: '10px 0' }}>
        <span>Quantité :</span>
        <input
          type="number"
          value={quantity}
          min={1}
          max={availableStock || 1}
          onChange={(e) =>
            setQuantity(
              Math.max(1, Math.min(Number(e.target.value), availableStock || 1))
            )
          }
          style={{ width: 60 }}
          disabled={!selectedVariant}
        />
        <span
          style={{
            color:
              loading || availableStock === null
                ? '#888'
                : availableStock <= 10
                ? 'red'
                : 'green',
            fontSize: 13,
            marginLeft: 8
          }}
        >
          {loading
            ? '(Vérification...)'
            : availableStock === 0
            ? 'Indisponible'
            : availableStock <= 10
            ? `Stock limité : seulement ${availableStock}`
            : 'Disponible'}
        </span>
      </div>

      <div style={{ fontWeight: 'bold', margin: '12px 0' }}>
        Prix:{' '}
        {selectedVariant
          ? `${Number(selectedVariant.price).toFixed(2)} $`
          : 'Sélectionne une variante'}
      </div>

      <button
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
        className="shop-btn"
      >
        Ajouter au panier
      </button>
    </div>
  );
};

export default ProductDetail;

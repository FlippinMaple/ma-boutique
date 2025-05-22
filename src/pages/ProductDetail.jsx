import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../CartContext';
import { showAddToCartToast } from '../utils/alerts';
import axios from 'axios';
import './styles/ProductDetail.css';
import { useNavigate } from 'react-router-dom';

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Charge produit + variantes
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get('http://localhost:4242/api/products/' + id);
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

  // Met à jour variante sélectionnée
  useEffect(() => {
    if (!product) return;
    const variant = (product.variants || []).find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );
    setSelectedVariant(variant || null);
  }, [product, selectedColor, selectedSize]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get('http://localhost:4242/api/products/' + id);
        setProduct(res.data);
      } catch (err) {
        console.error('❌ Erreur chargement produit:', err);
        navigate('/shop'); // 🚀 Redirige automatiquement
      }
    };
    fetchProduct();
  }, [id]);

  // Vérifie disponibilité via ton serveur
  useEffect(() => {
    const fetchAvailability = async () => {
      if (selectedVariant?.printful_variant_id) {
        setLoading(true);
        try {
          const res = await axios.get(
            `http://localhost:4242/api/printful-stock/${selectedVariant.printful_variant_id}`
          );
          setIsAvailable(res.data.status === 'in_stock');
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

  if (!product) return <div>Chargement...</div>;

  const colors = [
    ...new Set((product.variants || []).map((v) => v.color).filter(Boolean))
  ];
  const sizes = [
    ...new Set((product.variants || []).map((v) => v.size).filter(Boolean))
  ];

  const canAddToCart = !!selectedVariant && isAvailable && quantity > 0;

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

      {/* Sélection couleur */}
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

      {/* Sélection taille */}
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

      {/* Quantité */}
      <div style={{ margin: '10px 0' }}>
        <span>Quantité :</span>
        <input
          type="number"
          value={quantity}
          min={1}
          max={isAvailable ? 10 : 1}
          onChange={(e) =>
            setQuantity(Math.max(1, Math.min(Number(e.target.value), 10)))
          }
          style={{ width: 60 }}
          disabled={!canAddToCart}
        />
        <span style={{ color: '#888', fontSize: 13 }}>
          {loading
            ? '(Vérification...)'
            : isAvailable
            ? 'Disponible'
            : 'Indisponible'}
        </span>
      </div>

      {/* Prix */}
      <div style={{ fontWeight: 'bold', margin: '12px 0' }}>
        Prix:{' '}
        {selectedVariant
          ? `${Number(selectedVariant.price).toFixed(2)} $`
          : 'Sélectionne une variante'}
      </div>

      {/* Ajouter au panier */}
      <button
        onClick={() => {
          addToCart({
            id: selectedVariant.id,
            name: product.name,
            price: Number(selectedVariant.price),
            image: selectedVariant.image || product.image,
            quantity,
            color: selectedVariant.color,
            size: selectedVariant.size,
            printful_variant_id: selectedVariant.printful_variant_id,
            variant_id: selectedVariant.variant_id // ✅ ajoute ceci
          });

          showAddToCartToast();
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

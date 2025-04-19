import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(
          'http://localhost:4242/store/full-products'
        );
        const found = res.data.result.find((p) => String(p.id) === id);
        setProduct(found);
      } catch (err) {
        console.error('Erreur de chargement du produit :', err);
      }
    };

    fetchProduct();
  }, [id]);

  if (!product) return <p style={{ padding: '2rem' }}>Chargement...</p>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <img
        src={product.image}
        alt={product.name}
        style={{ width: '100%', borderRadius: '10px' }}
      />
      <h2>{product.name}</h2>
      <p>
        <strong>Prix :</strong> {product.price.toFixed(2)} $
      </p>

      {/* Description si tu veux ajouter productMeta plus tard */}

      <Link
        to="/shop"
        style={{
          display: 'inline-block',
          marginTop: '1rem',
          textDecoration: 'none',
          backgroundColor: '#6c757d',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '5px'
        }}
      >
        ← Retour à la boutique
      </Link>
    </div>
  );
};

export default ProductDetail;

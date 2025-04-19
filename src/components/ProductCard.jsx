import { useCart } from '../CartContext';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const handleClick = () => {
    const item = {
      id: product.id,
      name: product.display_name,
      price: product.price || 29.99,
      image: product.image_url
    };
    addToCart(item);
  };

  return (
    <div
      style={{
        border: '1px solid #ccc',
        borderRadius: '10px',
        padding: '1rem',
        width: '220px',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <img
        src={product.image_url}
        alt={product.display_name}
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '6px',
          marginBottom: '1rem'
        }}
      />
      <h4 style={{ margin: 0 }}>{product.display_name}</h4>
      <p style={{ margin: '0.5rem 0' }}>
        {product.price ? `${product.price.toFixed(2)} $` : 'Prix non dispo'}
      </p>
      <button
        onClick={handleClick}
        style={{
          backgroundColor: '#1f8ef1',
          color: '#fff',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Ajouter au panier
      </button>
    </div>
  );
};

export default ProductCard;

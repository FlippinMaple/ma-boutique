import { useCart } from '../CartContext';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const handleClick = () => {
    if (!product.variants || product.variants.length === 0) {
      console.warn('⛔ Aucun variant pour le produit:', product);
      return;
    }

    const variant = product.variants[0];
    console.log('🧪 Variant reçu dans ProductCard:', variant);
    console.log('📛 variant_id:', variant.variant_id);

    const item = {
      id: variant.id, // ID local DB (nécessaire pour enregistrement DB locale)
      variant_id: variant.variant_id, // Court ID Printful (nécessaire pour Printful)
      printful_variant_id: variant.printful_variant_id, // si tu veux vraiment le garder aussi
      name: product.name,
      price: variant.price || 29.99,
      image: variant.image || product.image,
      quantity: 1
    };

    console.log('🛒 Item préparé pour le panier:', item);

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
        src={product.image || (product.variants?.[0]?.image ?? '')}
        alt={product.name}
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '6px',
          marginBottom: '1rem'
        }}
      />
      <h4 style={{ margin: 0 }}>{product.name}</h4>
      <p style={{ margin: '0.5rem 0' }}>
        {product.variants?.[0]?.price
          ? `${Number(product.variants[0].price).toFixed(2)} $`
          : 'Prix non dispo'}
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

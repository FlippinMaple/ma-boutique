import React from 'react';
import { useQuantityModal } from '../utils/modals';

const ProductCard = ({ product }) => {
  const openQuantityModal = useQuantityModal();

  const handleClick = () => {
    if (!product?.variants?.length) {
      console.warn('⛔ Aucun variant pour le produit:', product);
      return;
    }

    const variant = product.variants[0]; // ← Tu peux adapter si sélection multiple plus tard

    const item = {
      ...product,
      variant // ← On passe le variant directement
    };

    openQuantityModal(item);
  };

  return (
    <div className="border border-gray-300 rounded-xl p-4 text-center">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-64 object-cover rounded-md mb-4"
      />
      <h3 className="text-lg font-semibold">{product.name}</h3>
      <p className="text-sm text-gray-500">
        {product.variants[0]?.price || 29.99} $
      </p>
      <button
        onClick={handleClick}
        className="mt-3 bg-black text-white py-2 px-4 rounded hover:bg-gray-800"
      >
        Ajouter
      </button>
    </div>
  );
};

export default ProductCard;

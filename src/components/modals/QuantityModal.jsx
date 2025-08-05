import React, { useState, useEffect } from 'react';
import { useCart } from '../../CartContext';
import { useModal } from '../../context/ModalContext';
import toast from 'react-hot-toast';

const QuantityModal = ({ product }) => {
  const { addToCart } = useCart();
  const { closeModal } = useModal();

  const [quantity, setQuantity] = useState(1);
  const maxQuantity = product?.variant?.stock || 0;

  const isLowStock = maxQuantity > 0 && maxQuantity < 15;

  useEffect(() => {
    if (maxQuantity === 0) {
      toast.error('Ce produit est en rupture de stock.');
      closeModal();
    }
  }, [maxQuantity]);

  const handleChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0 && value <= maxQuantity) {
      setQuantity(value);
    }
  };

  const handleAdd = () => {
    if (quantity > maxQuantity) {
      toast.error(`Seulement ${maxQuantity} unités disponibles.`);
      return;
    }

    const item = {
      id: product.variant.id,
      variant_id: product.variant.variant_id,
      printful_variant_id: product.variant.printful_variant_id,
      name: product.name,
      price: product.variant.price || 29.99,
      image: product.variant.image || product.image,
      quantity
    };

    addToCart(item);
    toast.success(`${quantity} item(s) ajouté(s) au panier.`);
    closeModal();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg w-[90%] max-w-md mx-auto text-center">
      <h2 className="text-xl font-semibold mb-4">{product.name}</h2>

      <div className="mb-2">
        <input
          type="number"
          className={`border rounded px-4 py-2 text-lg w-24 text-center ${
            isLowStock ? 'text-red-600 border-red-400' : ''
          }`}
          value={quantity}
          onChange={handleChange}
          min={1}
          max={maxQuantity}
        />
      </div>

      {isLowStock && (
        <p className="text-sm text-red-500 mb-2">
          Stock faible : seulement {maxQuantity} disponibles
        </p>
      )}

      <button
        onClick={handleAdd}
        className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
      >
        Ajouter au panier
      </button>
    </div>
  );
};

export default QuantityModal;

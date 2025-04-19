import Swal from 'sweetalert2';

export const showAddToCartToast = () => {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: 'Ajouté au panier !',
    showConfirmButton: false,
    timer: 1500,
    background: '#e6fffa',
    color: '#1a202c'
  });
};

export const showQuantityAlert = (product, addToCart) => {
  Swal.fire({
    title: product.name,
    html: `
        <img src="${product.image}" alt="${
      product.name
    }" style="max-width: 100%; border-radius: 8px;" />
        <p style="margin-top: 10px;"><strong>Prix :</strong> ${product.price.toFixed(
          2
        )} $</p>
        <label for="qty">Quantité :</label>
        <select id="qty" style="margin-top: 10px; padding: 8px; width: 100%; border-radius: 6px; border: 1px solid #ccc;">
          ${Array.from(
            { length: 5 },
            (_, i) => `<option value="${i + 1}">${i + 1}</option>`
          ).join('')}
        </select>
      `,
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: 'Ajouter au panier',
    denyButtonText: 'Voir mon panier',
    cancelButtonText: 'Fermer',
    background: '#fff',
    color: '#333',
    preConfirm: () => {
      const select = Swal.getPopup().querySelector('#qty');
      return parseInt(select.value, 10);
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: result.value
      });
      showAddToCartToast();
    } else if (result.isDenied) {
      window.location.href = '/checkout';
    }
  });
};

export const showCheckoutConfirm = () => {
  return Swal.fire({
    title: 'Confirmer le paiement',
    text: 'Veux-tu vraiment passer à la caisse ?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Oui, payer',
    cancelButtonText: 'Annuler',
    background: '#f9f9f9',
    color: '#1a202c'
  });
};

export const showCheckoutError = () => {
  Swal.fire({
    icon: 'error',
    title: 'Erreur',
    text: 'Impossible de démarrer la session de paiement.',
    background: '#fff0f0',
    color: '#990000'
  });
};

export const showEmptyCartAlert = () => {
  return Swal.fire({
    title: 'Eh ben...',
    text: "T'as tout vidé! 🧹 Il reste plus rien ici.",
    icon: 'info',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    background: '#fffbe6',
    color: '#333',
    backdrop: `
      rgba(0,0,0,0.3)
      url("https://media.tenor.com/Vt1Z0i1_3VEAAAAd/shopping-cart.gif")
      center left
      no-repeat
    `
  });
};

export const showImageZoom = (product) => {
  return Swal.fire({
    imageUrl: product.image,
    imageAlt: product.name,
    imageWidth: '100%',
    background: '#fff',
    showConfirmButton: false,
    showCloseButton: true
  });
};

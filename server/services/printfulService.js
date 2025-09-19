import axios from 'axios';

export const getPrintfulVariantAvailability = async (printful_variant_id) => {
  try {
    const response = await axios.get(
      `https://api.printful.com/sync/variant/${printful_variant_id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
        }
      }
    );

    return response.data?.result?.sync_variant?.availability_status || null;
  } catch (error) {
    console.error(
      `❌ Erreur lors de la vérification Printful (${printful_variant_id}):`,
      error.message
    );
    throw new Error('Erreur lors de la communication avec Printful');
  }
};

// server/controllers/inventoryController.js
import axios from 'axios';
import { logWarn, logError } from '../utils/logger.js';

export async function getPrintfulStock(req, res) {
  const { variantId } = req.params;

  // validation rapide
  if (!variantId || isNaN(Number(variantId))) {
    await logWarn('variantId invalide pour /printful-stock', 'inventory', {
      variantId
    });
    return res.status(400).json({ error: 'Paramètre variantId invalide.' });
  }

  try {
    const r = await axios.get(
      `https://api.printful.com/sync/variant/${variantId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
        }
      }
    );

    const status =
      r.data?.result?.sync_variant?.availability_status || 'unknown';

    const isAvailable = status === 'active' || status === 'not_synced';
    const availableQuantity = isAvailable ? 999 : 0;

    res.json({
      status: isAvailable ? 'in_stock' : 'unavailable',
      rawStatus: status,
      available: availableQuantity
    });
  } catch (error) {
    await logError(
      `❌ Erreur Printful stock: ${
        error?.response?.data?.message || error?.message
      }`,
      'inventory',
      error
    );
    res
      .status(500)
      .json({ error: 'Erreur lors de la vérification de stock Printful.' });
  }
}

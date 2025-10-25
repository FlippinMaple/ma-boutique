// controllers/inventoryController.js
import { getPrintfulVariantAvailability } from '../services/printfulService.js';

/**
 * Renvoie un stock virtuel en fonction du statut de disponibilité Printful.
 * Les statuts "active" et "active-supplier" sont considérés comme disponibles (stock élevé).
 */
export async function getPrintfulStock(req, res) {
  const { id } = req.params; // id = printful_variant_id (long)
  try {
    const status = await getPrintfulVariantAvailability(id);
    let available = 0;
    if (status === 'active' || status === 'active-supplier') {
      available = 999;
    }
    return res.json({ available });
  } catch (err) {
    console.error('[printful-stock] id=', id, err.message);
    return res.status(500).json({
      error: 'PRINTFUL_STOCK_FAILED',
      message:
        err.message || 'Erreur lors de la récupération du statut Printful',
      hint: 'Assurez-vous que PRINTFUL_API_KEY et PRINTFUL_STORE_ID sont correctement configurés.'
    });
  }
}

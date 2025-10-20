// controllers/inventoryController.js
import axios from 'axios';

const PRINTFUL_TOKEN = process.env.PRINTFUL_TOKEN;

function isInternalPrintfulId(id) {
  return /^\d{10}$/.test(String(id)); // 10 chiffres => printful_variant_id interne
}

async function resolveShortVariantId(internalId) {
  // Récupère la variante pour extraire le variant_id "court" compatible
  const resp = await axios.get(
    `https://api.printful.com/variants/${internalId}`,
    { headers: { Authorization: `Bearer ${PRINTFUL_TOKEN}` } }
  );
  const r = resp?.data?.result;
  const shortId = r?.variant?.variant_id || r?.variant_id || r?.id;
  if (!shortId) {
    throw new Error(
      'Impossible de résoudre variant_id (court) à partir du printful_variant_id.'
    );
  }
  return shortId;
}

export async function getPrintfulStock(req, res) {
  const { id } = req.params; // peut être un 5 chiffres ou 10 chiffres
  try {
    let variantId = id;
    if (isInternalPrintfulId(id)) {
      variantId = await resolveShortVariantId(id);
    }

    // Exemple d’appel "stock" (à ajuster à ton endpoint réel)
    const stockResp = await axios.get(
      `https://api.printful.com/warehouse/stock?variant_id=${variantId}`,
      { headers: { Authorization: `Bearer ${PRINTFUL_TOKEN}` } }
    );

    return res.json(stockResp.data);
  } catch (err) {
    console.error('[printful-stock] id=', id, {
      status: err?.response?.status,
      data: err?.response?.data
    });
    return res.status(500).json({
      error: 'PRINTFUL_STOCK_FAILED',
      message: err?.response?.data || err.message,
      hint: isInternalPrintfulId(id)
        ? 'ID long détecté (printful_variant_id). Résolution vers variant_id court tentée.'
        : 'Vérifie que tu fournis bien un variant_id (court) pour cet endpoint.'
    });
  }
}

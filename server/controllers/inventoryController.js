// controllers/inventoryController.js
import { getPrintfulVariantAvailability } from '../services/printfulService.js';

// product_variants.printful_variant_id : bigint(20) signé (DATA_MODEL).
// Maximum positif : 9223372036854775807. Pas de UNIQUE schéma.
const PRINTFUL_VARIANT_ID_RE = /^[1-9]\d{0,18}$/;
const MAX_SIGNED_BIGINT = '9223372036854775807';

function parsePrintfulVariantIdParam(raw) {
  if (typeof raw !== 'string') return null;
  const id = raw.trim();
  if (!PRINTFUL_VARIANT_ID_RE.test(id)) return null;
  if (id.length === MAX_SIGNED_BIGINT.length && id > MAX_SIGNED_BIGINT) {
    return null;
  }
  return id;
}

/**
 * Renvoie une disponibilité Printful (booléen), pas un stock ni une quantité.
 * Les statuts "active" et "active-supplier" sont considérés comme disponibles.
 */
export async function getPrintfulStock(req, res) {
  const requestedId = parsePrintfulVariantIdParam(req.params.id);
  if (!requestedId) {
    return res.status(400).json({ error: 'Identifiant de variante invalide.' });
  }

  const db = req.app.locals.db;

  try {
    const [rows] = await db.query(
      `
      SELECT pv.printful_variant_id
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      WHERE pv.printful_variant_id = ?
        AND pv.is_active = 1
        AND p.is_visible = 1
      LIMIT 2
      `,
      [requestedId]
    );

    if (!Array.isArray(rows) || rows.length !== 1) {
      return res.status(400).json({ error: 'Variante indisponible.' });
    }

    const printfulVariantId = String(rows[0].printful_variant_id ?? '').trim();
    if (!PRINTFUL_VARIANT_ID_RE.test(printfulVariantId)) {
      return res.status(400).json({ error: 'Variante indisponible.' });
    }

    const status = await getPrintfulVariantAvailability(printfulVariantId);
    const available =
      status === 'active' || status === 'active-supplier';
    return res.json({ available });
  } catch (err) {
    console.error('[printful-stock] id=', requestedId, err.message);
    return res.status(500).json({
      error: 'PRINTFUL_STOCK_FAILED',
      message:
        err.message || 'Erreur lors de la récupération du statut Printful',
      hint: 'Assurez-vous que PRINTFUL_API_KEY et PRINTFUL_STORE_ID sont correctement configurés.'
    });
  }
}

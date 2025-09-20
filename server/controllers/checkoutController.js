import { getPrintfulVariantAvailability } from '../services/printfulService.js';
import { createStripeCheckoutSession } from '../services/stripeService.js';
import { insertOrder, insertOrderItem } from '../models/orderModel.js';
import { logInfo, logWarn, logError } from '../utils/logger.js';
import { insertAddress } from '../models/addressModel.js';

export const createCheckoutSession = async (req, res) => {
  if (!req.user || !req.user.email || !req.user.id) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  const { items, shipping, billing: _billing, shipping_rate } = req.body;
  const customer_email = req.user.email;
  const customer_id = req.user.id;

  try {
    const line_items = [];

    for (const item of items) {
      const { printful_variant_id, price, name, image, quantity } = item;

      if (!printful_variant_id || isNaN(Number(printful_variant_id))) {
        console.warn(
          `❌ variant_id manquant ou invalide pour l’item ${item.id}`
        );
        continue;
      }

      const status = await getPrintfulVariantAvailability(printful_variant_id);

      if (status !== 'active') {
        const msg = `⚠️ Produit indisponible (ID ${printful_variant_id}) : ${status}`;
        console.warn(msg);
        await logWarn(`${msg} pour ${customer_email}`, 'checkout');

        return res.status(400).json({
          error: `Le produit "${
            item.name || `#${item.id}`
          }" n'est plus disponible.`
        });
      }

      line_items.push({
        price_data: {
          currency: 'cad',
          product_data: {
            name:
              typeof name === 'string' && name.trim() !== ''
                ? name.trim()
                : `Produit #${item.id}`,
            images: image ? [image] : []
          },
          unit_amount: !isNaN(Number(price))
            ? Math.round(Number(price) * 100)
            : 1000
        },
        quantity: quantity || 1
      });
    }

    if (
      shipping_rate &&
      typeof shipping_rate.name === 'string' &&
      shipping_rate.name.trim() !== '' &&
      !isNaN(Number(shipping_rate.rate))
    ) {
      line_items.push({
        price_data: {
          currency: 'cad',
          product_data: {
            name: `Livraison (${shipping_rate.name.trim()})`
          },
          unit_amount: Math.round(Number(shipping_rate.rate) * 100)
        },
        quantity: 1
      });
    }

    if (line_items.length === 0) {
      const msg = `Aucun article valide pour la commande de ${customer_email}`;
      await logWarn(msg, 'checkout');
      return res
        .status(400)
        .json({ error: 'Le panier ne contient aucun article valide.' });
    }

    const session = await createStripeCheckoutSession({
      line_items,
      customer_email,
      shipping
    });

    await logInfo(
      `Session Stripe ${session.id} créée pour ${customer_email}`,
      'checkout'
    );

    const orderTotal = line_items.reduce(
      (sum, item) => sum + (item.price_data.unit_amount * item.quantity) / 100,
      0
    );

    const shippingCost = shipping_rate ? parseFloat(shipping_rate.rate) : 0;

    const shipping_address_id = await insertAddress(
      customer_id,
      'shipping',
      shipping
    );

    const orderId = await insertOrder({
      customer_id,
      customer_email,
      shipping_address_id,
      billing_address_id: null,
      total: orderTotal,
      shipping_cost: shippingCost
    });

    await logInfo(
      `Commande ${orderId} enregistrée pour ${customer_email}`,
      'checkout'
    );

    for (const item of items) {
      const {
        id: variantId,
        printful_variant_id,
        quantity,
        price,
        color,
        size,
        ...rest
      } = item;

      const meta = {
        ...(color && { color }),
        ...(size && { size }),
        ...rest
      };

      await insertOrderItem(
        orderId,
        variantId,
        printful_variant_id,
        quantity,
        price,
        meta
      );

      await logInfo(
        `Item ${variantId} x${quantity} ajouté à la commande ${orderId} pour ${customer_email}`,
        'checkout'
      );
    }

    res.json({ url: session.url });
  } catch (error) {
    const msg = `Erreur Stripe: ${
      error?.response?.data?.message || error.message
    }`;
    console.error(msg);
    await logError(msg, 'checkout');

    res
      .status(500)
      .json({ error: 'Erreur lors de la création de la session.' });
  }
};

import rateLimit from 'express-rate-limit';

export const shippingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 20, // 20 appels/min/IP
  standardHeaders: true,
  legacyHeaders: false
});

export const inventoryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // plus permissif pour le stock
  standardHeaders: true,
  legacyHeaders: false
});

export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Trop de tentatives de paiement. Réessaie dans quelques instants.',
      code: 'CHECKOUT_RATE_LIMITED'
    });
  }
});

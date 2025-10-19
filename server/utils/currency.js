// server/utils/currency.js

/**
 * Convertit un montant en cents (number|string) vers un float en dollars.
 * - Tolère string/number/null/undefined
 * - Retourne 0 si la valeur est invalide
 */
export function centsToFloat(cents) {
  const n = typeof cents === 'string' ? Number(cents) : cents;
  if (!Number.isFinite(n)) return 0;
  // évite les imprécisions en restant au cent près
  return Math.round(n) / 100;
}

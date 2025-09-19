import { logError } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  console.error('🔥 ERREUR NON GÉRÉE :', err);

  // Log en base si dispo
  if (err?.message) {
    logError(`Erreur non interceptée : ${err.message}`, 'global');
  }

  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur'
  });
}

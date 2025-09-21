// server/middlewares/errorHandler.js
import { logError } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  // on log l’erreur non gérée avec le contexte http + infos utiles
  logError('🔥 ERREUR NON GÉRÉE', 'http', {
    message: err?.message,
    stack: err?.stack,
    path: req?.path,
    method: req?.method
  });

  const status = err?.status || 500;
  res.status(status).json({
    message: err?.message || 'Erreur serveur'
  });
}

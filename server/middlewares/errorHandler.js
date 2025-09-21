// server/middlewares/errorHandler.js
import { logError } from '../utils/logger.js';

/** 404 (route non trouvée) */
export function notFound(req, res, _next) {
  const payload = {
    error: 'Not Found',
    path: req.originalUrl,
    method: req.method
  };
  // res.status peut être absent en cas de réponse "brute" – fallback writeHead
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(404).json(payload);
  }
  try {
    res.writeHead?.(404, { 'Content-Type': 'application/json' });
    res.end?.(JSON.stringify(payload));
  } catch {}
}

/** Handler d’erreurs Express (signature à 4 args OBLIGATOIRE) */
export function errorHandler(err, req, res, _next) {
  const status = err?.statusCode || err?.status || 500;
  const body = {
    error: err?.message || 'Erreur interne',
    ...(process.env.NODE_ENV !== 'production' ? { stack: err?.stack } : {})
  };

  // log en base (sans casser la réponse si ça échoue)
  logError(`[${req.method} ${req.originalUrl}] ${body.error}`, 'server').catch(
    () => {}
  );

  // Si on a une réponse Express, utilise-la
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(body);
  }

  // Fallback Node.js pur (au cas où ce ne soit pas un objet Response Express)
  try {
    res.writeHead?.(status, { 'Content-Type': 'application/json' });
    res.end?.(JSON.stringify(body));
  } catch {
    // dernier recours : rien à faire
  }
}

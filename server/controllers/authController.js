import {
  handleUserRegistration,
  login,
  logout,
  refreshToken
} from '../services/authService.js';
import { logInfo, logError } from '../utils/logger.js';

// POST /api/auth/register
export async function registerUser(req, res) {
  try {
    let { first_name, last_name, email, password, is_subscribed } = req.body;

    first_name = first_name?.trim().toLowerCase();
    last_name = last_name?.trim().toLowerCase();
    email = email?.trim().toLowerCase();

    const userId = await handleUserRegistration({
      first_name,
      last_name,
      email,
      password,
      is_subscribed
    });

    await logInfo(`Inscription réussie pour ${email} (ID ${userId})`, 'auth');

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès.',
      user_id: userId
    });
  } catch (err) {
    await logError(
      `Erreur inscription (${req.body?.email}) : ${err.message}`,
      'auth'
    );
    return res.status(400).json({ success: false, error: err.message });
  }
}

// POST /api/auth/login
export async function loginUser(req, res) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Corps JSON manquant ou invalide.' });
  }
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  try {
    const result = await login(email, password);
    await logInfo(`Connexion réussie pour ${email.toLowerCase()}`, 'auth');
    res.json(result);
  } catch (err) {
    await logError(`Erreur connexion (${email}) : ${err.message}`, 'auth');
    res.status(401).json({ error: err.message });
  }
}

// POST /api/auth/logout
export async function logoutUser(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: 'Refresh token manquant.' });

  try {
    await logout(refreshToken);
    await logInfo('Déconnexion réussie.', 'auth');
    res.json({ message: 'Déconnexion effectuée.' });
  } catch (err) {
    await logError(`Erreur logout : ${err.message}`, 'auth');
    res.status(500).json({ error: 'Erreur lors de la déconnexion.' });
  }
}

// POST /api/auth/refresh-token
export async function handleRefreshToken(req, res) {
  const { refreshToken: token } = req.body;

  if (!token) return res.status(401).json({ error: 'Token manquant.' });

  try {
    const result = await refreshToken(token);
    await logInfo(`Refresh token utilisé avec succès.`, 'auth');
    res.json(result);
  } catch (err) {
    await logError(`Erreur refresh token : ${err.message}`, 'auth');
    res.status(403).json({ error: 'Token invalide ou expiré.' });
  }
}

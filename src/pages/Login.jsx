import React, { useState } from 'react';
import api from '../utils/api';
import { formatEmail } from '../utils/textHelpers'; // ✅
import { toast } from 'react-hot-toast'; // ✅

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[login] submit start'); // 🔎

    if (!email || !password) {
      toast.error('Les champs email et mot de passe sont requis.');
      return;
    }

    setLoading(true);
    try {
      console.log('[login] calling /auth/login'); // 🔎
      const { status, data } = await api.post('/auth/login', {
        email: formatEmail(email),
        password
      });
      console.log('[login] response:', status, data); // 🔎
      toast.success('Connexion réussie !');
      setEmail('');
      setPassword('');
      window.location.href = '/dashboard';
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Erreur lors de la connexion.';
      console.error('[login] error:', err); // 🔎
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Se connecter</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Connexion en cours...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
};

export default Login;

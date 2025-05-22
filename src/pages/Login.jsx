import React, { useState } from 'react';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Les champs email et mot de passe sont requis.');
      return;
    }

    setLoading(true);

    try {
      // --- APPEL AU BON ENDPOINT ---
      const response = await axios.post('http://localhost:4242/api/login', {
        email,
        password
      });
      // --- STOCKAGE DES DEUX TOKENS ---
      localStorage.setItem('authToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);

      setSuccess('Connexion réussie !');
      setError('');
      setLoading(false);
      setEmail('');
      setPassword('');
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la connexion.');
      setSuccess('');
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Se connecter</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>{success}</div>}
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
          Se connecter
        </button>
      </form>
      {loading && <div>Chargement...</div>}
    </div>
  );
};

export default Login;

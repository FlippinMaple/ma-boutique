import React, { useState } from 'react';
import axios from 'axios';
import { formatEmail } from '../utils/textHelpers'; // ✅
import { toast } from 'react-hot-toast'; // ✅

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Les champs email et mot de passe sont requis.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:4242/api/login', {
        email: formatEmail(email),
        password
      });

      localStorage.setItem('authToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);

      toast.success('Connexion réussie !');
      setEmail('');
      setPassword('');
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la connexion.');
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

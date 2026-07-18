// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatEmail } from '../utils/textHelpers';
import toast from 'react-hot-toast';

const Login = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Les champs email et mot de passe sont requis.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: formatEmail(email),
        password
      });

      const name = data.user?.name || data.user?.email?.split('@')[0] || 'ami';
      const role = data.user?.role || 'user';

      if (typeof onAuthSuccess === 'function') {
        onAuthSuccess(data.user || { role, email: data.user?.email });
      }

      toast.success(
        role === 'admin' ? `Bienvenue, ${name} (admin)` : `Bienvenue, ${name}`,
        { id: 'login-ok' }
      );

      setEmail('');
      setPassword('');

      navigate(role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Erreur lors de la connexion.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Se connecter</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
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

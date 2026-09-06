// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { capitalizeSmart } from '../utils/textHelpers';
import { toast } from 'react-hot-toast';
import './styles/Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/auth/whoami');
        if (!cancelled) {
          setUser(data.user || null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          navigate('/login');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout'); // nettoie les cookies côté serveur
    } catch {
      /* ignore */
    } finally {
      toast('Déconnexion effectuée.');
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-page__inner">
          <p className="dashboard-page__state">Chargement…</p>
        </div>
      </main>
    );
  }
  if (!user) return null;

  const displayFirst = capitalizeSmart(user.first_name || '');
  const displayLast = capitalizeSmart(user.last_name || '');

  return (
    <main className="dashboard-page">
      <div className="dashboard-page__inner">
        <h1 className="dashboard-page__title">
          Bienvenue {displayFirst} {displayLast}
        </h1>
        <p className="dashboard-page__email">{user.email}</p>
        <button
          className="dashboard-page__logout"
          type="button"
          onClick={handleLogout}
        >
          Se déconnecter
        </button>
      </div>
    </main>
  );
};

export default Dashboard;

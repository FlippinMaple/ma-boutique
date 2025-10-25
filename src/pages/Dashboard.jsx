// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { capitalizeSmart } from '../utils/textHelpers';
import { toast } from 'react-hot-toast';

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
      toast('Déconnexion effectuée. 👋');
      navigate('/login');
    }
  };

  if (loading) return <div>Chargement…</div>;
  if (!user) return null;

  const displayFirst = capitalizeSmart(user.first_name || '');
  const displayLast = capitalizeSmart(user.last_name || '');

  return (
    <div>
      <h2>
        Bienvenue {displayFirst} {displayLast}
      </h2>
      <p>{user.email}</p>
      <button onClick={handleLogout}>Se déconnecter</button>
    </div>
  );
};

export default Dashboard;

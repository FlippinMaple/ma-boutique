import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { capitalizeSmart } from '../utils/textHelpers';
import { toast } from 'react-hot-toast'; // ✅ Import du toast

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!token) {
      toast.error('Session expirée. Veuillez vous reconnecter.');
      navigate('/login');
    } else {
      try {
        const decoded = jwtDecode(token);

        if (decoded.exp * 1000 < Date.now()) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          localStorage.removeItem('authToken');
          navigate('/login');
        } else {
          setUser(decoded);
        }
      } catch (error) {
        toast.error('Token invalide. Veuillez vous reconnecter.');
        console.error('Token invalide ou expiré:', error);
        navigate('/login');
      }
    }

    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    toast('Déconnexion effectuée. 👋');
    navigate('/login');
  };

  if (loading) return <div>Chargement...</div>;

  if (!user) return null; // L'erreur a déjà été toatée + redirection faite

  const displayFirst = capitalizeSmart(user.first_name || '');
  const displayLast = capitalizeSmart(user.last_name || '');

  return (
    <div>
      <h2>
        Bienvenue, {displayFirst} {displayLast}
      </h2>
      <p>Bienvenue sur votre tableau de bord sécurisé !</p>
      <button onClick={handleLogout}>Se déconnecter</button>
    </div>
  );
};

export default Dashboard;

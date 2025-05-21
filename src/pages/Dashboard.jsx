import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // <-- CORRECT

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Pour gérer l'état de chargement
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken'); // Récupérer le token JWT

    if (!token) {
      // Si aucun token n'est trouvé, rediriger vers la page de connexion
      navigate('/login');
    } else {
      try {
        // Décoder le token avec jwt-decode
        const decoded = jwtDecode(token);

        // Vérifier l'expiration du token
        if (decoded.exp * 1000 < Date.now()) {
          // Si le token est expiré, le supprimer du localStorage et rediriger vers la page de connexion
          localStorage.removeItem('authToken');
          navigate('/login');
        } else {
          // Si le token est valide, stocker les informations de l'utilisateur
          setUser(decoded);
        }
      } catch (error) {
        console.error('Token invalide ou expiré:', error);
        navigate('/login'); // Rediriger vers la page de connexion si le token est invalide
      }
    }

    setLoading(false); // Fin du chargement après la vérification
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('authToken'); // Supprimer le token du localStorage
    localStorage.removeItem('refreshToken'); // Supprimer le refresh token, si utilisé
    navigate('/login'); // Rediriger vers la page de connexion
  };

  if (loading) {
    return <div>Chargement...</div>; // Affichage pendant la vérification du token
  }

  if (!user) {
    return <div>Session expirée, veuillez vous reconnecter.</div>; // Si le token est expiré ou invalide
  }

  return (
    <div>
      <h2>Bienvenue, {user.name}</h2>
      <p>Bienvenue sur votre tableau de bord sécurisé !</p>
      <button onClick={handleLogout}>Se déconnecter</button>
    </div>
  );
};

export default Dashboard;

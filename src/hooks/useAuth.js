import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // <-- CORRECTION ICI

const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (token) {
      try {
        const decoded = jwtDecode(token); // Décodage correct du token

        // Vérification de l'expiration du token
        if (decoded.exp * 1000 > Date.now()) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('authToken'); // Si le token est expiré, le supprimer
          navigate('/login'); // Redirection vers la page de login
        }
      } catch (error) {
        setIsAuthenticated(false);
        navigate('/login');
      }
    } else {
      setIsAuthenticated(false);
      navigate('/login');
    }
  }, [navigate]);

  return { isAuthenticated };
};

export default useAuth;

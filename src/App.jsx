import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // <<<<<< Correction ici
import Header from './components/Header';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import Cancel from './pages/Cancel';
import ProductDetail from './pages/ProductDetail';
import PreviewOrder from './pages/PreviewOrder';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import axios from 'axios'; // Pour envoyer des requêtes HTTP

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // État pour gérer l'affichage du chargement
  const [error, setError] = useState(''); // Pour afficher des messages d'erreur
  const [success, setSuccess] = useState(''); // Pour afficher des messages de succès

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (token) {
      try {
        const decoded = jwtDecode(token); // Décoder le token

        // Vérifier si le token est expiré
        if (decoded.exp * 1000 > Date.now()) {
          setIsAuthenticated(true);
        } else {
          // Si le token est expiré, rafraîchir le token avec le refresh token
          refreshAccessToken(refreshToken);
        }
      } catch (error) {
        console.error('Erreur de décodage du token', error);
        setIsAuthenticated(false);
        setError('Le token est invalide. Veuillez vous reconnecter.');
      }
    } else {
      setIsAuthenticated(false);
    }

    setLoading(false); // Fin du chargement après la vérification
  }, []); // L'effet ne s'exécute qu'au premier chargement de la page

  // Fonction pour rafraîchir l'access token
  const refreshAccessToken = async (refreshToken) => {
    try {
      const response = await axios.post(
        'http://localhost:4242/api/refresh-token',
        { refreshToken }
      );
      localStorage.setItem('authToken', response.data.accessToken); // Mettre à jour le token
      setIsAuthenticated(true);
      setSuccess('Token renouvelé avec succès !'); // Message de succès
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token', error);
      setError(
        'Erreur lors du renouvellement du token. Veuillez vous reconnecter.'
      );
      setIsAuthenticated(false);
    }
  };

  // Fonction pour la déconnexion
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    window.location.href = '/login'; // Redirige vers la page de connexion
  };

  if (loading) {
    return <div>Chargement...</div>; // Affichage pendant le chargement du token
  }

  return (
    <Router>
      <Header />
      {/* Affichage des messages d'erreur ou de succès */}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>{success}</div>}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route path="/shop" element={<Shop />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/preview-order" element={<PreviewOrder />} />
      </Routes>
    </Router>
  );
}

export default App;

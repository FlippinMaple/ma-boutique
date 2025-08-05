import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast'; // ✅ toast + composant
import { ModalProvider } from './context/ModalContext'; // ← AJOUT ICI

// Pages et composants
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (token) {
      try {
        const decoded = jwtDecode(token);

        if (decoded.exp * 1000 > Date.now()) {
          setIsAuthenticated(true);
        } else {
          refreshAccessToken(refreshToken);
        }
      } catch (error) {
        console.error('Erreur de décodage du token', error);
        setIsAuthenticated(false);
        toast.error('Le token est invalide. Veuillez vous reconnecter.');
      }
    } else {
      setIsAuthenticated(false);
    }

    setLoading(false);
  }, []);

  const refreshAccessToken = async (refreshToken) => {
    try {
      const response = await axios.post(
        'http://localhost:4242/api/refresh-token',
        { refreshToken }
      );
      localStorage.setItem('authToken', response.data.accessToken);
      setIsAuthenticated(true);
      toast.success('Token renouvelé avec succès !');
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token', error);
      toast.error(
        'Erreur lors du renouvellement du token. Veuillez vous reconnecter.'
      );
      setIsAuthenticated(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <ModalProvider>
      <Router>
        <Header />
        <Toaster position="top-right" /> {/* ✅ Affichage global des toasts */}
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
    </ModalProvider>
  );
}

export default App;

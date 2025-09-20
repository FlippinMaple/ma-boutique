import { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from './utils/api';
import toast, { Toaster } from 'react-hot-toast'; // ✅ toast + composant
import { ModalProvider } from './context/ModalContext';

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
import ProtectedCheckoutRoute from './components/ProtectedCheckoutRoute';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔒 Gardes anti-doublons (React 18 StrictMode / effets concurrents)
  const initRanRef = useRef(false);
  const refreshingRef = useRef(false);

  // 🔁 Rafraîchir le token d'accès sans dupliquer les toasts / requêtes
  const refreshAccessToken = async (refreshToken) => {
    if (refreshingRef.current) return null; // déjà en cours → on sort
    refreshingRef.current = true;

    try {
      if (!refreshToken) throw new Error('No refresh token');
      const { data } = await api.post('/api/auth/refresh-token', {
        refreshToken
      });

      localStorage.setItem('authToken', data.accessToken);
      setIsAuthenticated(true);

      // ✅ id fixe → pas de doublon même si ré-exécuté
      toast.success('Session renouvelée ✔️', { id: 'refresh-ok' });

      return data.accessToken;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token', error);
      toast.error(
        'Erreur lors du renouvellement du token. Veuillez vous reconnecter.',
        { id: 'refresh-fail' }
      );
      setIsAuthenticated(false);
      return null;
    } finally {
      refreshingRef.current = false;
    }
  };

  // 🔐 Initialisation auth (protégée contre le double-run en dev)
  useEffect(() => {
    if (initRanRef.current) return; // évite double exécution en dev
    initRanRef.current = true;

    (async () => {
      try {
        const token = localStorage.getItem('authToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (token) {
          let valid = false;
          try {
            const decoded = jwtDecode(token);
            valid = decoded?.exp * 1000 > Date.now();
          } catch {
            valid = false;
          }

          if (valid) {
            setIsAuthenticated(true);
          } else if (refreshToken) {
            await refreshAccessToken(refreshToken);
          } else {
            setIsAuthenticated(false);
            toast.error('Session expirée. Connecte-toi de nouveau.', {
              id: 'session-expired'
            });
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Init auth error:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        <Header onLogout={handleLogout} />
        {/* ✅ Un seul Toaster global */}
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route path="/shop" element={<Shop />} />
          <Route
            path="/checkout"
            element={
              <ProtectedCheckoutRoute>
                <Checkout />
              </ProtectedCheckoutRoute>
            }
          />
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

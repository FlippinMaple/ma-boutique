// src/App.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate
} from 'react-router-dom';
import api from './utils/api';
import { Toaster } from 'react-hot-toast';
import { ModalProvider } from './context/ModalContext';

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

import { adminRoutes } from './admin/AdminRoutes';

function AppInner() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const initRanRef = useRef(false);
  const navigate = useNavigate();

  const applyUser = useCallback((nextUser) => {
    if (nextUser) {
      setIsAuthenticated(true);
      setUser(nextUser);
      setUserRole(nextUser.role || null);
    } else {
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
    }
  }, []);

  const fetchWhoami = useCallback(async () => {
    const { data } = await api.get('/auth/whoami');
    return data?.user || null;
  }, []);

  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;

    (async () => {
      try {
        try {
          const u = await fetchWhoami();
          applyUser(u);
        } catch (err) {
          if (err?.response?.status !== 401) {
            applyUser(null);
            return;
          }
          try {
            await api.post('/auth/refresh-token');
            const u = await fetchWhoami();
            applyUser(u);
          } catch {
            applyUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [applyUser, fetchWhoami]);

  const handleAuthSuccess = useCallback(
    (nextUser) => {
      applyUser(nextUser || null);
    },
    [applyUser]
  );

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    } finally {
      applyUser(null);
      navigate('/login', { replace: true });
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <>
      <Header
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        userRole={userRole}
        user={user}
      />
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/login"
          element={<Login onAuthSuccess={handleAuthSuccess} />}
        />
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
        <Route path="/checkout/success" element={<Success />} />
        <Route path="/checkout/cancel" element={<Cancel />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/preview-order" element={<PreviewOrder />} />
        {adminRoutes}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ModalProvider>
      <Router>
        <AppInner />
      </Router>
    </ModalProvider>
  );
}

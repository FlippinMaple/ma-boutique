// src/components/PrivateRoute.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../utils/api';

const PrivateRoute = ({ element }) => {
  const [state, setState] = useState({ loading: true, ok: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api.get('/api/auth/whoami'); // lit le cookie "access"
        if (!cancelled) setState({ loading: false, ok: true });
      } catch {
        if (!cancelled) setState({ loading: false, ok: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) return null; // ou un petit spinner

  return state.ok ? element : <Navigate to="/login" replace />;
};

export default PrivateRoute;

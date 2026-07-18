// src/admin/AdminGuard.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../utils/api';

export default function AdminGuard({ children }) {
  const [status, setStatus] = useState('loading'); // loading | ok | login | dashboard

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get('/auth/whoami');
        const role = data?.user?.role;
        if (cancelled) return;
        if (role === 'admin') {
          setStatus('ok');
        } else {
          setStatus('dashboard');
        }
      } catch (err) {
        if (cancelled) return;
        const code = err?.response?.status;
        if (code === 401 || code === 403) {
          setStatus('login');
        } else {
          setStatus('login');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return <div className="p-6">Chargement...</div>;
  }
  if (status === 'login') {
    return <Navigate to="/login" replace />;
  }
  if (status === 'dashboard') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

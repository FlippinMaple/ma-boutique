// src/admin/AdminRoutes.jsx
import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import AdminGuard from './AdminGuard';

const AdminLayout = lazy(() => import('./AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/Dashboard'));
const AdminProducts = lazy(() => import('./pages/Products'));
const AdminOrders = lazy(() => import('./pages/Orders'));
const AdminOrderDetail = lazy(() => import('./pages/OrderDetail'));
const AdminAbandoned = lazy(() => import('./pages/AbandonedCarts'));
const AdminStripeEvents = lazy(() => import('./pages/StripeEvents'));
const AdminLogs = lazy(() => import('./pages/Logs'));
const AdminUsers = lazy(() => import('./pages/Users'));

export const adminRoutes = (
  <Route
    path="/admin"
    element={
      <AdminGuard>
        <Suspense fallback={<div className="p-6">Chargement admin...</div>}>
          <AdminLayout />
        </Suspense>
      </AdminGuard>
    }
  >
    <Route
      index
      element={
        <Suspense fallback={<div className="p-6">Chargement...</div>}>
          <AdminDashboard />
        </Suspense>
      }
    />
    <Route
      path="products"
      element={
        <Suspense fallback={<div className="p-6">Chargement...</div>}>
          <AdminProducts />
        </Suspense>
      }
    />
    <Route
      path="orders"
      element={
        <Suspense fallback={<div className="p-6">Chargement...</div>}>
          <AdminOrders />
        </Suspense>
      }
    />
    <Route
      path="orders/:id"
      element={
        <Suspense fallback={<div className="p-6">Chargement...</div>}>
          <AdminOrderDetail />
        </Suspense>
      }
    />
    <Route
      path="abandoned-carts"
      element={
        <Suspense fallback={<div className="p-6">Chargement...</div>}>
          <AdminAbandoned />
        </Suspense>
      }
    />
    <Route
      path="stripe-events"
      element={
        <Suspense fallback={<div className="p-6">Chargement...</div>}>
          <AdminStripeEvents />
        </Suspense>
      }
    />
    <Route
      path="logs"
      element={
        <Suspense fallback={<div className="p-6">Chargement...</div>}>
          <AdminLogs />
        </Suspense>
      }
    />
    <Route
      path="users"
      element={
        <Suspense fallback={<div className="p-6">Chargement...</div>}>
          <AdminUsers />
        </Suspense>
      }
    />
  </Route>
);

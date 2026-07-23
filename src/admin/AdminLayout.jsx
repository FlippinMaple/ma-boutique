// src/admin/AdminLayout.jsx
import { Outlet, NavLink, Link } from 'react-router-dom';

const linkStyle = ({ isActive }) => ({
  display: 'block',
  padding: '10px 12px',
  borderRadius: 8,
  textDecoration: 'none',
  color: isActive ? '#0f172a' : '#334155',
  background: isActive ? '#e2e8f0' : 'transparent',
  fontWeight: isActive ? 700 : 500
});

export default function AdminLayout() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        minHeight: '100vh'
      }}
    >
      <aside
        style={{
          padding: 16,
          borderRight: '1px solid #e5e7eb',
          background: '#f8fafc'
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: 18
            }}
          >
            Retour boutique
          </Link>
        </div>

        <h2
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: 12
          }}
        >
          Console Admin
        </h2>
        <nav style={{ display: 'grid', gap: 6 }}>
          <NavLink to="/admin" end style={linkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/products" style={linkStyle}>
            Produits
          </NavLink>
          <NavLink to="/admin/orders" style={linkStyle}>
            Commandes
          </NavLink>
          <NavLink to="/admin/stripe-events" style={linkStyle}>
            Evenements Stripe
          </NavLink>
          <NavLink to="/admin/abandoned-carts" style={linkStyle}>
            Paniers abandonnes
          </NavLink>
          <NavLink to="/admin/logs" style={linkStyle}>
            Logs
          </NavLink>
          <NavLink to="/admin/users" style={linkStyle}>
            Utilisateurs
          </NavLink>
        </nav>

        <div style={{ marginTop: 24, fontSize: 12, color: '#64748b' }}>
          <div>Raccourcis</div>
          <ul style={{ marginTop: 8, paddingLeft: 16 }}>
            <li>
              <span style={{ color: '#64748b' }}>
                (API) paid sans items - via UI Orders
              </span>
            </li>
          </ul>
        </div>
      </aside>

      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}

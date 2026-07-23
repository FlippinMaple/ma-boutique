// src/admin/pages/Products.jsx
import { useCallback, useEffect, useState } from 'react';

const money = new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD',
});

function formatPrice(price) {
  if (price == null || price === '') return '—';
  const n = Number(price);
  if (!Number.isFinite(n)) return '—';
  return money.format(n);
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [maxFeatured, setMaxFeatured] = useState(4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/products', {
        credentials: 'include',
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          (data && data.error) || 'Impossible de charger les produits.'
        );
      }

      setProducts(Array.isArray(data?.results) ? data.results : []);
      if (Number.isFinite(data?.maxFeatured) && data.maxFeatured > 0) {
        setMaxFeatured(data.maxFeatured);
      }
    } catch (err) {
      setProducts([]);
      setError(err?.message || 'Impossible de charger les produits.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const featuredCount = products.filter((product) =>
    Boolean(product.is_featured)
  ).length;

  async function toggleFeatured(product) {
    const nextValue = !Boolean(product.is_featured);
    setUpdatingId(product.id);
    setError('');

    try {
      const response = await fetch(
        `/api/admin/products/${product.id}/featured`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ is_featured: nextValue }),
        }
      );

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          (data && data.error) || 'Impossible de modifier le produit.'
        );
      }

      setProducts((prev) =>
        prev.map((item) => {
          if (item.id !== product.id) return item;
          const updated = data.product || item;
          if (updated.price === undefined) {
            return { ...updated, price: item.price };
          }
          return updated;
        })
      );

      if (Number.isFinite(data?.maxFeatured) && data.maxFeatured > 0) {
        setMaxFeatured(data.maxFeatured);
      }
    } catch (err) {
      setError(err?.message || 'Impossible de modifier le produit.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#0f172a',
            margin: 0,
          }}
        >
          Produits
        </h1>
        <p style={{ marginTop: 8, color: '#475569', maxWidth: 640 }}>
          Choisis jusqu’à {maxFeatured} produits à afficher dans la sélection
          de la page d’accueil.
        </p>
        <p style={{ marginTop: 8, fontWeight: 600, color: '#0f172a' }}>
          {featuredCount} / {maxFeatured} produits vedettes
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: '10px 12px',
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <p style={{ color: '#64748b' }}>Chargement des produits...</p>
      ) : products.length === 0 ? (
        <p style={{ color: '#64748b' }}>Aucun produit nommé disponible.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14,
              color: '#0f172a',
            }}
          >
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '10px 8px', fontWeight: 700 }}>Aperçu</th>
                <th style={{ padding: '10px 8px', fontWeight: 700 }}>Produit</th>
                <th style={{ padding: '10px 8px', fontWeight: 700 }}>Prix</th>
                <th style={{ padding: '10px 8px', fontWeight: 700 }}>
                  Visibilité
                </th>
                <th style={{ padding: '10px 8px', fontWeight: 700 }}>
                  Page d’accueil
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isFeatured = Boolean(product.is_featured);
                const isVisible = Boolean(product.is_visible);
                const isUpdating = updatingId === product.id;
                const disabledByInvisible = !isVisible && !isFeatured;
                const disabledByCap =
                  featuredCount >= maxFeatured && !isFeatured;
                const disabled =
                  isUpdating || disabledByInvisible || disabledByCap;

                let title;
                if (!isFeatured && disabledByInvisible) {
                  title =
                    'Ce produit est masqué et ne peut pas être mis en vedette.';
                } else if (!isFeatured && disabledByCap) {
                  title = `Maximum de ${maxFeatured} produits vedettes atteint.`;
                }

                return (
                  <tr
                    key={product.id}
                    style={{ borderBottom: '1px solid #e5e7eb' }}
                  >
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt=""
                          width={64}
                          height={80}
                          style={{
                            width: 64,
                            height: 80,
                            objectFit: 'cover',
                            display: 'block',
                            background: '#f1f5f9',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 64,
                            height: 80,
                            background: '#e2e8f0',
                            color: '#64748b',
                            fontSize: 11,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: 4,
                            boxSizing: 'border-box',
                          }}
                        >
                          Aucun aperçu
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600 }}>{product.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        ID {product.id}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                      {formatPrice(product.price)}
                    </td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                      {isVisible ? 'Visible' : 'Masqué'}
                    </td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                      <button
                        type="button"
                        onClick={() => toggleFeatured(product)}
                        disabled={disabled}
                        aria-pressed={isFeatured}
                        title={title}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: isFeatured
                            ? '1px solid #cbd5e1'
                            : '1px solid #0f172a',
                          background: isFeatured ? '#fff' : '#0f172a',
                          color: isFeatured ? '#0f172a' : '#fff',
                          fontWeight: 600,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.55 : 1,
                        }}
                      >
                        {isUpdating
                          ? 'Enregistrement...'
                          : isFeatured
                            ? 'Retirer'
                            : 'Mettre en vedette'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// src/admin/pages/Orders.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Orders() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const filtersRef = useRef({ q, status });
  filtersRef.current = { q, status };

  const load = useCallback(() => {
    const { q: qVal, status: statusVal } = filtersRef.current;
    const params = new URLSearchParams({
      q: qVal,
      status: statusVal,
      page,
      pageSize: 25
    });
    fetch(`/api/admin/orders?${params.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data.results) ? data.results : []))
      .catch(() => setRows([]));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500">
            Recherche (email/id)
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">(tous)</option>
            <option value="pending">pending</option>
            <option value="paid">paid</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
        <button
          onClick={() => {
            setPage(1);
            load();
          }}
          className="px-3 py-2 rounded bg-black text-white"
        >
          Filtrer
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">ID</th>
            <th>Status</th>
            <th>Items</th>
            <th>Total</th>
            <th>Email</th>
            <th>Creee</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-b hover:bg-gray-50">
              <td className="py-2">
                <Link className="underline" to={`/admin/orders/${o.id}`}>
                  {o.id}
                </Link>
              </td>
              <td>{o.status}</td>
              <td>{o.items_count}</td>
              <td>
                {o.total} {o.currency}
              </td>
              <td>{o.customer_email}</td>
              <td>{new Date(o.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="py-4" colSpan={6}>
                Aucune commande.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1 rounded border"
        >
          Precedent
        </button>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 rounded border"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}

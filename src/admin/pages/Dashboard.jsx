// src/admin/pages/Dashboard.jsx
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetch('/api/admin/health/paid-without-items', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Anomalies - paid sans items</h2>
      {rows.length === 0 ? (
        <div>Aucune anomalie</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">ID</th>
              <th>Email</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-b hover:bg-gray-50">
                <td className="py-2">{o.id}</td>
                <td>{o.customer_email}</td>
                <td>
                  {o.total} {o.currency}
                </td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

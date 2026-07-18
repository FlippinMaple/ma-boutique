// src/admin/pages/OrderDetail.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function OrderDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, [id]);

  if (!data) return <div>Chargement...</div>;

  const { order, items, history } = data;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded border">
        <h2 className="text-lg font-semibold mb-2">Commande #{order.id}</h2>
        <div className="text-sm grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <b>Status:</b> {order.status}
          </div>
          <div>
            <b>Total:</b> {order.total} {order.currency}
          </div>
          <div>
            <b>Email:</b> {order.customer_email}
          </div>
          <div>
            <b>Creee:</b> {new Date(order.created_at).toLocaleString()}
          </div>
          <div>
            <b>Payee:</b>{' '}
            {order.paid_at ? new Date(order.paid_at).toLocaleString() : '-'}
          </div>
          <div>
            <b>Stripe session:</b> {order.stripe_session_id || '-'}
          </div>
        </div>
      </div>

      <div className="p-4 rounded border">
        <h3 className="font-semibold mb-2">Items</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Variant (business)</th>
              <th>Printful ID</th>
              <th>Qte</th>
              <th>Prix unitaire</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b">
                <td className="py-2">{it.variant_business_id}</td>
                <td>{it.printful_variant_id}</td>
                <td>{it.quantity}</td>
                <td>{it.price_at_purchase}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4">
                  Aucun item (a surveiller)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 rounded border">
        <h3 className="font-semibold mb-2">Historique</h3>
        <ul className="list-disc ml-6 text-sm">
          {history.map((h, i) => (
            <li key={i}>
              {h.old_status} -&gt; <b>{h.new_status}</b> (
              {new Date(h.changed_at).toLocaleString()})
            </li>
          ))}
          {history.length === 0 && <li>Aucun changement.</li>}
        </ul>
      </div>
    </div>
  );
}

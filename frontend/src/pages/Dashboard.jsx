import { useEffect, useState } from 'react';
import api from '../api';

const errMsg = (e) => e.response?.data?.message || 'Request failed';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [status, setStatus] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [s, r, st] = await Promise.all([
          api.get('/api/dashboard/stats'),
          api.get('/api/dashboard/recent-orders?limit=5'),
          api.get('/api/dashboard/order-status'),
        ]);
        setStats(s.data);
        setRecent(r.data.orders || []);
        setStatus(st.data.breakdown || []);
      } catch (e) { setError(errMsg(e)); }
    })();
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading dashboard...</p>;

  const cards = [
    { label: 'Revenue', value: '₹' + stats.totalRevenue, accent: 'green' },
    { label: 'Orders', value: stats.totalOrders, accent: 'blue' },
    { label: 'Users', value: stats.totalUsers, accent: 'purple' },
    { label: 'Products', value: stats.totalProducts, accent: 'orange' },
    { label: 'Pending Orders', value: stats.pendingOrders, accent: 'red' },
    { label: 'Admins', value: stats.totalAdmins, accent: 'gray' },
  ];

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="cards">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card accent-${c.accent}`}>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="grid2">
        <div className="panel">
          <h3>Recent Orders</h3>
          {recent.length === 0 ? <p className="muted">No orders yet</p> : (
            <table className="tbl">
              <thead><tr><th>ID</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>{recent.map((o) => (
                <tr key={o.id}><td>#{o.id}</td><td>₹{o.total_amount}</td>
                  <td><span className={`badge b-${o.status}`}>{o.status}</span></td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div className="panel">
          <h3>Orders by Status</h3>
          {status.length === 0 ? <p className="muted">No data</p> : status.map((s) => (
            <div key={s.status} className="meter-row">
              <span>{s.status}</span><b>{s.count}</b>
              <div className="meter"><div className="meter-fill" style={{ width: Math.min(s.count * 20, 100) + '%' }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

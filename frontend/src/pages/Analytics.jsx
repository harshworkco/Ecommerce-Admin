import { useEffect, useState } from 'react';
import api from '../api';

const errMsg = (e) => e.response?.data?.message || 'Request failed';

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [topProd, setTopProd] = useState([]);
  const [topCust, setTopCust] = useState([]);
  const [pay, setPay] = useState({ byMethod: [], byStatus: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [o, r, tp, tc, p] = await Promise.all([
          api.get('/api/analytics/overview'),
          api.get('/api/analytics/revenue?days=7'),
          api.get('/api/analytics/top-products'),
          api.get('/api/analytics/top-customers'),
          api.get('/api/analytics/payments'),
        ]);
        setOverview(o.data);
        setRevenue(r.data.chart || []);
        setTopProd(tp.data.products || []);
        setTopCust(tc.data.customers || []);
        setPay(p.data);
      } catch (e) { setError(errMsg(e)); }
    })();
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!overview) return <p className="muted">Loading analytics...</p>;

  const maxRev = Math.max(...revenue.map((r) => parseFloat(r.revenue)), 1);

  return (
    <div>
      <h1 className="page-title">Analytics</h1>
      <div className="cards">
        <div className="stat-card accent-green"><div className="stat-value">₹{overview.totalRevenue}</div><div className="stat-label">Total Revenue</div></div>
        <div className="stat-card accent-blue"><div className="stat-value">{overview.totalOrders}</div><div className="stat-label">Orders</div></div>
        <div className="stat-card accent-purple"><div className="stat-value">₹{overview.avgOrderValue}</div><div className="stat-label">Avg Order</div></div>
        <div className="stat-card accent-orange"><div className="stat-value">₹{overview.collectedPayments}</div><div className="stat-label">Collected</div></div>
        <div className="stat-card accent-gray"><div className="stat-value">{overview.last30dOrders}</div><div className="stat-label">Orders (30d)</div></div>
        <div className="stat-card accent-gray"><div className="stat-value">{overview.last30dUsers}</div><div className="stat-label">New Users (30d)</div></div>
      </div>
      <div className="grid2">
        <div className="panel">
          <h3>Revenue — last 7 days</h3>
          {revenue.length === 0 ? <p className="muted">No data</p> : revenue.map((r) => (
            <div key={r.date} className="meter-row">
              <span>{new Date(r.date).toLocaleDateString()} · {r.orders} orders</span><b>₹{r.revenue}</b>
              <div className="meter"><div className="meter-fill green" style={{ width: (parseFloat(r.revenue) / maxRev) * 100 + '%' }} /></div>
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>Payments by method</h3>
          <table className="tbl">
            <thead><tr><th>Method</th><th>Count</th><th>Amount</th></tr></thead>
            <tbody>{pay.byMethod.map((m) => (
              <tr key={m.method}><td>{m.method}</td><td>{m.count}</td><td>₹{m.amount}</td></tr>
            ))}</tbody>
          </table>
          <h3>By status</h3>
          <table className="tbl">
            <thead><tr><th>Status</th><th>Count</th><th>Amount</th></tr></thead>
            <tbody>{pay.byStatus.map((s) => (
              <tr key={s.status}><td>{s.status}</td><td>{s.count}</td><td>₹{s.amount}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div className="grid2">
        <div className="panel">
          <h3>Top Products</h3>
          <table className="tbl">
            <thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead>
            <tbody>{topProd.map((p, i) => (
              <tr key={i}><td>{p.product_name}</td><td>{p.totalQty}</td><td>₹{p.totalRevenue}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="panel">
          <h3>Top Customers</h3>
          <table className="tbl">
            <thead><tr><th>Customer</th><th>Orders</th><th>Spent</th></tr></thead>
            <tbody>{topCust.map((c, i) => (
              <tr key={i}><td>{c.customer_name}</td><td>{c.orders}</td><td>₹{c.spent}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

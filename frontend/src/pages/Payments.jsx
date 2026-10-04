import { useEffect, useState } from 'react';
import api from '../api';

const errMsg = (e) => e.response?.data?.message || 'Request failed';
const METHODS = ['cod', 'card', 'upi', 'netbanking', 'wallet'];
const STATUSES = ['pending', 'success', 'failed', 'refunded'];

export default function Payments() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [collected, setCollected] = useState(0);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ order_id: '', method: 'cod', status: 'pending', transaction_id: '' });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/api/payments', { params: filter ? { status: filter } : {} });
      setList(data.payments || []);
      setTotal(data.total || 0);
      setCollected(data.collected || 0);
    } catch (e) { setError(errMsg(e)); }
  };

  useEffect(() => { load(); }, [filter]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/payments', {
        order_id: parseInt(form.order_id),
        method: form.method, status: form.status,
        transaction_id: form.transaction_id || null,
      });
      setForm({ order_id: '', method: 'cod', status: 'pending', transaction_id: '' });
      load();
    } catch (e) { setError(errMsg(e)); }
  };

  const changeStatus = async (p) => {
    const v = prompt(`Status (${STATUSES.join(',')}):`, p.status);
    if (!v) return;
    try { await api.put(`/api/payments/${p.id}/status`, { status: v }); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  const remove = async (id) => {
    if (!confirm('Delete payment #' + id + '?')) return;
    try { await api.delete(`/api/payments/${id}`); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <div>
      <h1 className="page-title">Payments <span className="count">{total}</span></h1>
      {error && <p className="error">{error}</p>}
      <div className="cards">
        <div className="stat-card accent-green"><div className="stat-value">₹{collected}</div><div className="stat-label">Collected</div></div>
      </div>
      <form className="form-card" onSubmit={create}>
        <h3>Record payment</h3>
        <div className="form-grid">
          <input className="input" type="number" placeholder="Order ID *" value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} required />
          <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input" placeholder="Transaction ID (optional)" value={form.transaction_id} onChange={(e) => setForm({ ...form, transaction_id: e.target.value })} />
        </div>
        <div className="form-actions"><button className="btn btn-primary">Record</button></div>
      </form>
      <div className="toolbar">
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="panel">
        <table className="tbl">
          <thead><tr><th>ID</th><th>Order</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{list.map((p) => (
            <tr key={p.id}>
              <td>#{p.id}</td><td>#{p.order_id}</td><td>₹{p.amount}</td><td>{p.method}</td>
              <td><span className={`badge b-${p.status}`}>{p.status}</span></td>
              <td className="actions">
                <button className="btn btn-sm" onClick={() => changeStatus(p)}>Status</button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>Del</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {list.length === 0 && <p className="muted">No payments</p>}
      </div>
    </div>
  );
}

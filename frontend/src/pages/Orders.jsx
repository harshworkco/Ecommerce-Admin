import { useEffect, useState } from 'react';
import api from '../api';

const errMsg = (e) => e.response?.data?.message || 'Request failed';
const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function Orders() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ customer_name: '', customer_email: '', items: '' });

  const load = async () => {
    try {
      const params = { page: 1, limit: 20 };
      if (status) params.status = status;
      if (search) params.search = search;
      const { data } = await api.get('/api/orders', { params });
      setList(data.orders || []);
      setTotal(data.total || 0);
    } catch (e) { setError(errMsg(e)); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search, status]);

  const parseItems = (str) =>
    str.split(',').map((s) => {
      const [product_name, quantity, price] = s.split(':').map((x) => x.trim());
      return { product_name, quantity: parseInt(quantity) || 1, price: parseFloat(price) || 0 };
    }).filter((x) => x.product_name && x.price > 0);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/orders', {
        customer_name: form.customer_name,
        customer_email: form.customer_email || null,
        items: parseItems(form.items),
      });
      setForm({ customer_name: '', customer_email: '', items: '' });
      load();
    } catch (e) { setError(errMsg(e)); }
  };

  const view = async (id) => {
    try { const { data } = await api.get(`/api/orders/${id}`); setDetail(data); }
    catch (e) { setError(errMsg(e)); }
  };

  const changeStatus = async (id, current) => {
    const v = prompt(`Status (${STATUSES.join(',')}):`, current);
    if (!v) return;
    try { await api.put(`/api/orders/${id}/status`, { status: v }); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  const remove = async (id) => {
    if (!confirm('Delete order #' + id + '?')) return;
    try { await api.delete(`/api/orders/${id}`); setDetail(null); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <div>
      <h1 className="page-title">Orders <span className="count">{total}</span></h1>
      {error && <p className="error">{error}</p>}
      <form className="form-card" onSubmit={create}>
        <h3>Create order</h3>
        <div className="form-grid">
          <input className="input" placeholder="Customer name *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
          <input className="input" placeholder="Customer email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
          <input className="input span2" placeholder="Items: T-Shirt:2:500, Jeans:1:1200" value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} />
        </div>
        <div className="form-actions"><button className="btn btn-primary">Create</button></div>
      </form>
      <div className="toolbar">
        <input className="input" placeholder="Search name / email / id" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="panel">
        <table className="tbl">
          <thead><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Pay</th><th>Actions</th></tr></thead>
          <tbody>{list.map((o) => (
            <tr key={o.id}>
              <td>#{o.id}</td><td>{o.customer_name}</td><td>₹{o.total_amount}</td>
              <td><span className={`badge b-${o.status}`}>{o.status}</span></td>
              <td>{o.payment_status}</td>
              <td className="actions">
                <button className="btn btn-sm" onClick={() => view(o.id)}>View</button>
                <button className="btn btn-sm" onClick={() => changeStatus(o.id, o.status)}>Status</button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(o.id)}>Del</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {list.length === 0 && <p className="muted">No orders</p>}
      </div>
      {detail && (
        <div className="panel">
          <h3>Order #{detail.order.id}</h3>
          <p className="muted">{detail.order.customer_name} · {detail.order.customer_email} · ₹{detail.order.total_amount}</p>
          <table className="tbl">
            <thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
            <tbody>{detail.items.map((i) => (
              <tr key={i.id}><td>{i.product_name}</td><td>{i.quantity}</td><td>₹{i.price}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

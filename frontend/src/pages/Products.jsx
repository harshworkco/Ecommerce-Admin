import { useEffect, useState } from 'react';
import api from '../api';

const errMsg = (e) => e.response?.data?.message || 'Request failed';
const empty = { name: '', description: '', price: '', stock: '', category: '', image_url: '' };

export default function Products() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/api/products', { params: search ? { search } : {} });
      setList(data.products || []);
      setTotal(data.total || 0);
    } catch (e) { setError(errMsg(e)); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) || 0 };
      if (editing) await api.put(`/api/products/${editing}`, payload);
      else await api.post('/api/products', payload);
      setForm(empty); setEditing(null); load();
    } catch (e) { setError(errMsg(e)); }
  };

  const edit = (p) => {
    setEditing(p.id);
    setForm({ name: p.name, description: p.description || '', price: p.price, stock: p.stock, category: p.category || '', image_url: p.image_url || '' });
  };

  const updateStock = async (p) => {
    const v = prompt('New stock for ' + p.name + ':', p.stock);
    if (v === null) return;
    try { await api.put(`/api/products/${p.id}/stock`, { stock: parseInt(v) }); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  const remove = async (id) => {
    if (!confirm('Delete product #' + id + '?')) return;
    try { await api.delete(`/api/products/${id}`); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <div>
      <h1 className="page-title">Products <span className="count">{total}</span></h1>
      {error && <p className="error">{error}</p>}
      <form className="form-card" onSubmit={submit}>
        <h3>{editing ? `Edit #${editing}` : 'Add product'}</h3>
        <div className="form-grid">
          <input className="input" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className="input" type="number" min="0" step="0.01" placeholder="Price *" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input className="input" type="number" min="0" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <input className="input span2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="input span2" placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary">{editing ? 'Update' : 'Add'}</button>
          {editing && <button type="button" className="btn" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}
        </div>
      </form>
      <div className="toolbar">
        <input className="input" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="panel">
        <table className="tbl">
          <thead><tr><th>ID</th><th>Name</th><th>Price</th><th>Stock</th><th>Category</th><th>Actions</th></tr></thead>
          <tbody>{list.map((p) => (
            <tr key={p.id}>
              <td>#{p.id}</td><td>{p.name}</td><td>₹{p.price}</td>
              <td><span className={p.stock < 10 ? 'low-stock' : ''}>{p.stock}</span></td>
              <td>{p.category || '-'}</td>
              <td className="actions">
                <button className="btn btn-sm" onClick={() => edit(p)}>Edit</button>
                <button className="btn btn-sm" onClick={() => updateStock(p)}>Stock</button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>Del</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {list.length === 0 && <p className="muted">No products found</p>}
      </div>
    </div>
  );
}

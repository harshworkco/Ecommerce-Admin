import { useEffect, useState } from 'react';
import api from '../api';

const errMsg = (e) => e.response?.data?.message || 'Request failed';

export default function Users() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '' });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/api/users', { params: search ? { search } : {} });
      setList(data.users || []);
      setTotal(data.total || 0);
    } catch (e) { setError(errMsg(e)); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/users', form);
      setForm({ name: '', email: '' });
      load();
    } catch (e) { setError(errMsg(e)); }
  };

  const toggle = async (u) => {
    try { await api.put(`/api/users/${u.id}/status`, { is_active: !u.is_active }); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  const remove = async (id) => {
    if (!confirm('Delete user #' + id + '?')) return;
    try { await api.delete(`/api/users/${id}`); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <div>
      <h1 className="page-title">Users <span className="count">{total}</span></h1>
      {error && <p className="error">{error}</p>}
      <form className="form-card" onSubmit={create}>
        <h3>Add customer</h3>
        <div className="form-grid">
          <input className="input" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="form-actions"><button className="btn btn-primary">Add</button></div>
      </form>
      <div className="toolbar">
        <input className="input" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="panel">
        <table className="tbl">
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Active</th><th>Orders</th><th>Actions</th></tr></thead>
          <tbody>{list.map((u) => (
            <tr key={u.id}>
              <td>#{u.id}</td><td>{u.name}</td><td>{u.email}</td>
              <td><span className={u.is_active ? 'pill pill-active' : 'pill pill-blocked'}>{u.is_active ? 'Active' : 'Blocked'}</span></td><td>{u.order_count || 0}</td>
              <td className="actions">
                <button className="btn btn-sm" onClick={() => toggle(u)}>{u.is_active ? 'Block' : 'Unblock'}</button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(u.id)}>Del</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {list.length === 0 && <p className="muted">No users</p>}
      </div>
    </div>
  );
}

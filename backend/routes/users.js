const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// GET /api/users?search=&page=1&limit=10&is_active=
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    const { search, is_active } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (is_active === 'true' || is_active === 'false') {
      where += ' AND u.is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.address, u.is_active, u.created_at,
        (SELECT COUNT(*) FROM orders WHERE user_id = u.id OR customer_email = u.email) AS order_count
       FROM users u ${where} ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ total, page, limit, totalPages: Math.ceil(total / limit), users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:id (with orders)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, is_active, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = rows[0];
    const [orders] = await pool.query(
      'SELECT id, total_amount, status, payment_status, created_at FROM orders WHERE user_id = ? OR customer_email = ? ORDER BY created_at DESC LIMIT 10',
      [user.id, user.email]
    );
    res.json({ user, orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'name and email are required' });

    const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length > 0) return res.status(409).json({ message: 'Email already exists' });

    const password_hash = password ? await bcrypt.hash(password, 10) : null;
    const [result] = await pool.query(
      'INSERT INTO users (name, email, phone, password_hash, address) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, password_hash, address || null]
    );
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, is_active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json({ message: 'User created', user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'User not found' });

    if (req.body.email && req.body.email !== existing[0].email) {
      const [dup] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [req.body.email, req.params.id]);
      if (dup.length > 0) return res.status(409).json({ message: 'Email already exists' });
    }

    const u = existing[0];
    const name = req.body.name ?? u.name;
    const email = req.body.email ?? u.email;
    const phone = req.body.phone ?? u.phone;
    const address = req.body.address ?? u.address;
    let password_hash = u.password_hash;
    if (req.body.password) password_hash = await bcrypt.hash(req.body.password, 10);

    await pool.query('UPDATE users SET name=?, email=?, phone=?, password_hash=?, address=? WHERE id=?',
      [name, email, phone, password_hash, address, req.params.id]);

    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, is_active, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'User updated', user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id/status {is_active: true/false} - block/unblock
router.put('/:id/status', async (req, res) => {
  try {
    const is_active = req.body.is_active === true || req.body.is_active === 1 ? 1 : 0;
    const [result] = await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, is_active, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: is_active ? 'User activated' : 'User blocked', user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    // FK-safe: if orders reference user later, MySQL will error - report clearly
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ message: 'Cannot delete user with existing orders. Block instead.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

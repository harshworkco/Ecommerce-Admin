const express = require('express');
const { pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const PAY_STATUS = ['pending', 'success', 'failed', 'refunded'];
const PAY_METHODS = ['cod', 'card', 'upi', 'netbanking', 'wallet'];

function mapToOrderPayStatus(payStatus) {
  if (payStatus === 'success') return 'paid';
  if (payStatus === 'refunded') return 'refunded';
  return 'unpaid';
}

// GET /api/payments?search=&status=&method=&page=1&limit=10
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    const { status, method, search } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (status && PAY_STATUS.includes(status)) {
      where += ' AND p.status = ?';
      params.push(status);
    }
    if (method && PAY_METHODS.includes(method)) {
      where += ' AND p.method = ?';
      params.push(method);
    }
    if (search) {
      where += ' AND (p.transaction_id LIKE ? OR CAST(p.order_id AS CHAR) = ?)';
      params.push(`%${search}%`, search);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM payments p ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT p.*, o.customer_name, o.total_amount AS order_total
       FROM payments p LEFT JOIN orders o ON o.id = p.order_id
       ${where} ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const [sumRows] = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS collected FROM payments p ${where} AND p.status='success'`.replace('WHERE 1=1 AND', 'WHERE'),
      params
    ).catch(() => [{ collected: 0 }]);

    res.json({ total, page, limit, totalPages: Math.ceil(total / limit), payments: rows, collected: sumRows[0]?.collected || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/payments/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT p.*, o.customer_name FROM payments p LEFT JOIN orders o ON o.id=p.order_id WHERE p.id=?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Payment not found' });
    res.json({ payment: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/payments {order_id, amount?, method, status?, transaction_id?}
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { order_id, method, status, transaction_id } = req.body;
    if (!order_id) return res.status(400).json({ message: 'order_id is required' });

    const finalMethod = PAY_METHODS.includes(method) ? method : 'cod';
    const finalStatus = PAY_STATUS.includes(status) ? status : 'pending';

    const [orders] = await conn.query('SELECT * FROM orders WHERE id = ?', [order_id]);
    if (orders.length === 0) return res.status(404).json({ message: 'Order not found' });
    const order = orders[0];

    let amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0) amount = parseFloat(order.total_amount);

    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO payments (order_id, user_id, amount, method, status, transaction_id) VALUES (?, ?, ?, ?, ?, ?)',
      [order_id, order.user_id || req.body.user_id || null, amount, finalMethod, finalStatus, transaction_id || null]
    );
    await conn.query('UPDATE orders SET payment_status = ? WHERE id = ?', [mapToOrderPayStatus(finalStatus), order_id]);
    await conn.commit();

    const [rows] = await pool.query('SELECT * FROM payments WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'Payment recorded', payment: rows[0] });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'transaction_id already exists' });
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

// PUT /api/payments/:id/status {status}
router.put('/:id/status', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { status } = req.body;
    if (!PAY_STATUS.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${PAY_STATUS.join(', ')}` });
    }
    const [existing] = await conn.query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Payment not found' });

    await conn.beginTransaction();
    await conn.query('UPDATE payments SET status = ? WHERE id = ?', [status, req.params.id]);
    await conn.query('UPDATE orders SET payment_status = ? WHERE id = ?', [mapToOrderPayStatus(status), existing[0].order_id]);
    await conn.commit();

    const [rows] = await pool.query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Payment status updated', payment: rows[0] });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

// DELETE /api/payments/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM payments WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Payment not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const { pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const ORDER_STATUS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUS = ['unpaid', 'paid', 'refunded'];

// GET /api/orders?search=&status=&page=1&limit=10
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    const { status, search } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (status && ORDER_STATUS.includes(status)) {
      where += ' AND o.status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND (o.customer_name LIKE ? OR o.customer_email LIKE ? OR o.id = ?)';
      params.push(`%${search}%`, `%${search}%`, parseInt(search) || 0);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM orders o ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT o.*, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
       FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ total, page, limit, totalPages: Math.ceil(total / limit), orders: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/:id (with items)
router.get('/:id', async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ message: 'Order not found' });
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json({ order: orders[0], items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { customer_name, customer_email, shipping_address, status, payment_status, items } = req.body;

    if (!customer_name) return res.status(400).json({ message: 'customer_name is required' });

    const finalStatus = ORDER_STATUS.includes(status) ? status : 'pending';
    const finalPay = PAYMENT_STATUS.includes(payment_status) ? payment_status : 'unpaid';

    // total from items if provided, else body total_amount
    let total_amount = parseFloat(req.body.total_amount) || 0;
    if (Array.isArray(items) && items.length > 0) {
      total_amount = items.reduce((s, it) => s + (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 1), 0);
    }
    if (total_amount <= 0) return res.status(400).json({ message: 'total_amount or items with price/qty required' });

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO orders (user_id, customer_name, customer_email, total_amount, status, payment_status, shipping_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.body.user_id || null, customer_name, customer_email || null, total_amount, finalStatus, finalPay, shipping_address || null]
    );
    const orderId = result.insertId;

    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        if (!it.product_name || !it.price) continue;
        await conn.query(
          'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, it.product_name, parseInt(it.quantity) || 1, parseFloat(it.price)]
        );
      }
    }

    await conn.commit();
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    const [orderItems] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    res.status(201).json({ message: 'Order created', order: orders[0], items: orderItems });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

// PUT /api/orders/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!ORDER_STATUS.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${ORDER_STATUS.join(', ')}` });
    }
    const [result] = await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Order not found' });
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Status updated', order: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/orders/:id (edit fields)
router.put('/:id', async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Order not found' });
    const o = existing[0];

    const customer_name = req.body.customer_name ?? o.customer_name;
    const customer_email = req.body.customer_email ?? o.customer_email;
    const shipping_address = req.body.shipping_address ?? o.shipping_address;
    const total_amount = req.body.total_amount != null ? parseFloat(req.body.total_amount) : o.total_amount;
    const status = req.body.status ? (ORDER_STATUS.includes(req.body.status) ? req.body.status : null) : o.status;
    const payment_status = req.body.payment_status ? (PAYMENT_STATUS.includes(req.body.payment_status) ? req.body.payment_status : null) : o.payment_status;

    if (!status || !payment_status) {
      return res.status(400).json({ message: 'Invalid status or payment_status value' });
    }

    await pool.query(
      'UPDATE orders SET customer_name=?, customer_email=?, total_amount=?, status=?, payment_status=?, shipping_address=? WHERE id=?',
      [customer_name, customer_email, total_amount, status, payment_status, shipping_address, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Order updated', order: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

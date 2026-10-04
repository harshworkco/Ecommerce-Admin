const express = require('express');
const { pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// GET /api/analytics/overview
router.get('/overview', async (req, res) => {
  try {
    const [[orderAgg]] = await pool.query(
      'SELECT COUNT(*) AS totalOrders, COALESCE(SUM(total_amount),0) AS totalRevenue, COALESCE(AVG(total_amount),0) AS avgOrderValue FROM orders'
    );
    const [[userAgg]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
    const [[payAgg]] = await pool.query("SELECT COALESCE(SUM(amount),0) AS collected FROM payments WHERE status='success'");
    const [[newOrders]] = await pool.query('SELECT COUNT(*) AS c FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    const [[newUsers]] = await pool.query('SELECT COUNT(*) AS c FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');

    res.json({
      totalOrders: Number(orderAgg.totalOrders),
      totalRevenue: Number(orderAgg.totalRevenue),
      avgOrderValue: Number(Number(orderAgg.avgOrderValue).toFixed(2)),
      totalUsers: Number(userAgg.totalUsers),
      collectedPayments: Number(payAgg.collected),
      last30dOrders: Number(newOrders.c),
      last30dUsers: Number(newUsers.c),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/revenue?days=30 - per-day revenue + orders
router.get('/revenue', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const [rows] = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS orders, COALESCE(SUM(total_amount),0) AS revenue
       FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at) ORDER BY date ASC`,
      [days]
    );
    res.json({ days, chart: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/top-products?limit=5 - from order_items
router.get('/top-products', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 50);
    const [rows] = await pool.query(
      `SELECT product_name, SUM(quantity) AS totalQty, SUM(quantity*price) AS totalRevenue, COUNT(*) AS timesOrdered
       FROM order_items GROUP BY product_name ORDER BY totalQty DESC LIMIT ${limit}`
    );
    res.json({ products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/top-customers?limit=5 - by spend
router.get('/top-customers', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 50);
    const [rows] = await pool.query(
      `SELECT customer_name, customer_email, COUNT(*) AS orders, COALESCE(SUM(total_amount),0) AS spent
       FROM orders GROUP BY customer_name, customer_email ORDER BY spent DESC LIMIT ${limit}`
    );
    res.json({ customers: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/payments - breakdown by method + status
router.get('/payments', async (req, res) => {
  try {
    const [byMethod] = await pool.query(
      'SELECT method, COUNT(*) AS count, COALESCE(SUM(amount),0) AS amount FROM payments GROUP BY method'
    );
    const [byStatus] = await pool.query(
      'SELECT status, COUNT(*) AS count, COALESCE(SUM(amount),0) AS amount FROM payments GROUP BY status'
    );
    res.json({ byMethod, byStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/user-growth?days=30
router.get('/user-growth', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const [rows] = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS users
       FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at) ORDER BY date ASC`,
      [days]
    );
    res.json({ days, chart: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

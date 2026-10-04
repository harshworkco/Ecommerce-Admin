const express = require('express');
const { pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// All dashboard routes need login
router.use(authRequired);

// Helper: return 0 / [] if table doesn't exist yet (future steps)
async function safeGet(query, params = [], fallback = 0) {
  try {
    const [rows] = await pool.query(query, params);
    return rows;
  } catch (err) {
    // ER_NO_SUCH_TABLE = table not created yet in step-by-step flow
    if (err.code === 'ER_NO_SUCH_TABLE') return fallback;
    throw err;
  }
}

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const adminRows = await safeGet('SELECT COUNT(*) AS c FROM admins', [], [{ c: 0 }]);
    const orderRows = await safeGet('SELECT COUNT(*) AS c, COALESCE(SUM(total_amount),0) AS revenue FROM orders', [], [{ c: 0, revenue: 0 }]);
    const userRows = await safeGet('SELECT COUNT(*) AS c FROM users', [], [{ c: 0 }]);
    const productRows = await safeGet('SELECT COUNT(*) AS c FROM products', [], [{ c: 0 }]);
    const pendingRows = await safeGet("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'", [], [{ c: 0 }]);

    // customers table is Step 4 alternative name for users - try both
    let totalUsers = Number(userRows[0]?.c || 0);
    if (totalUsers === 0) {
      const custRows = await safeGet('SELECT COUNT(*) AS c FROM customers', [], [{ c: 0 }]);
      totalUsers = Number(custRows[0]?.c || 0);
    }

    res.json({
      totalAdmins: Number(adminRows[0]?.c || 0),
      totalOrders: Number(orderRows[0]?.c || 0),
      totalRevenue: Number(orderRows[0]?.revenue || 0),
      totalUsers,
      totalProducts: Number(productRows[0]?.c || 0),
      pendingOrders: Number(pendingRows[0]?.c || 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/dashboard/recent-orders?limit=5
router.get('/recent-orders', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 50);
    // limit is validated int, safe to inline (mysql placeholders reject LIMIT)
    const rows = await safeGet(
      `SELECT id, user_id, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT ${limit}`,
      [],
      []
    );
    // mysql2 needs limit as string? use query with parsed int safely
    if (Array.isArray(rows)) {
      res.json({ orders: rows });
    } else {
      res.json({ orders: [] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/dashboard/sales-chart?days=7 -> revenue per day
router.get('/sales-chart', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const rows = await safeGet(
      `SELECT DATE(created_at) AS date, COUNT(*) AS orders, COALESCE(SUM(total_amount),0) AS revenue
       FROM orders
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days],
      []
    );
    res.json({ chart: Array.isArray(rows) ? rows : [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/dashboard/order-status -> count by status
router.get('/order-status', async (req, res) => {
  try {
    const rows = await safeGet(
      'SELECT status, COUNT(*) AS count FROM orders GROUP BY status',
      [],
      []
    );
    res.json({ breakdown: Array.isArray(rows) ? rows : [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const { pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// GET /api/products?search=&category=&page=1&limit=10&is_active=
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    const { search, category, is_active } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      where += ' AND category = ?';
      params.push(category);
    }
    if (is_active === 'true' || is_active === 'false') {
      where += ' AND is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM products ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ total, page, limit, totalPages: Math.ceil(total / limit), products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ product: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const { name, description, price, stock, category, image_url } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) return res.status(400).json({ message: 'valid price is required' });

    const numStock = req.body.stock == null ? 0 : parseInt(stock);
    if (isNaN(numStock) || numStock < 0) return res.status(400).json({ message: 'stock must be 0 or more' });

    const [result] = await pool.query(
      'INSERT INTO products (name, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description || null, numPrice, numStock, category || null, image_url || null]
    );
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'Product created', product: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Product not found' });
    const p = existing[0];

    const name = req.body.name ?? p.name;
    const description = req.body.description ?? p.description;
    const category = req.body.category ?? p.category;
    const image_url = req.body.image_url ?? p.image_url;
    let price = p.price;
    let stock = p.stock;
    if (req.body.price != null) {
      price = parseFloat(req.body.price);
      if (isNaN(price) || price < 0) return res.status(400).json({ message: 'valid price is required' });
    }
    if (req.body.stock != null) {
      stock = parseInt(req.body.stock);
      if (isNaN(stock) || stock < 0) return res.status(400).json({ message: 'stock must be 0 or more' });
    }
    let is_active = p.is_active;
    if (req.body.is_active != null) is_active = req.body.is_active ? 1 : 0;

    await pool.query(
      'UPDATE products SET name=?, description=?, price=?, stock=?, category=?, image_url=?, is_active=? WHERE id=?',
      [name, description, price, stock, category, image_url, is_active, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product updated', product: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/products/:id/stock {stock}
router.put('/:id/stock', async (req, res) => {
  try {
    const stock = parseInt(req.body.stock);
    if (isNaN(stock) || stock < 0) return res.status(400).json({ message: 'stock must be 0 or more' });
    const [result] = await pool.query('UPDATE products SET stock = ? WHERE id = ?', [stock, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Stock updated', product: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

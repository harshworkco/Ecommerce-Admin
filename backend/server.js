const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDb, pool } = require('./config/db');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const analyticsRoutes = require('./routes/analytics');
const productRoutes = require('./routes/products');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Ecommerce Admin API running' });
});

// Auth APIs
app.use('/api/auth', authRoutes);

// Dashboard APIs (protected)
app.use('/api/dashboard', dashboardRoutes);

// Order APIs (protected) - Step 3
app.use('/api/orders', orderRoutes);

// User APIs (protected) - Step 4
app.use('/api/users', userRoutes);

// Payment APIs (protected) - Step 5
app.use('/api/payments', paymentRoutes);

// Analytics APIs (protected) - Step 6
app.use('/api/analytics', analyticsRoutes);

// Product APIs (protected) - Step 7
app.use('/api/products', productRoutes);

const PORT = process.env.PORT || 5000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to init DB:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

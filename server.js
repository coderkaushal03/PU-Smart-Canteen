const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { setupDatabase, pool } = require('./db.js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_smart_canteen_123';

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname)));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ error: "No token provided" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid or expired token" });
        req.user = user;
        next();
    });
};

/* --- Auth Routes --- */

// Register user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { signupName, signupId, signupEmail, signupPassword, signupRole } = req.body;
        
        if (!signupName || !signupId || !signupPassword || !signupRole) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const existingUser = await pool.query('SELECT * FROM users WHERE enrollment = $1 OR email = $2', [signupId, signupEmail]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User with this enrollment or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(signupPassword, 10);
        
        const result = await pool.query(
            'INSERT INTO users (name, enrollment, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [signupName, signupId, signupEmail, hashedPassword, signupRole]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.rows[0].id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { loginId, loginPassword, role } = req.body;

        const result = await pool.query('SELECT * FROM users WHERE (enrollment = $1 OR email = $1) AND role = $2', [loginId, role]);
        const user = result.rows[0];
        
        if (!user) {
            return res.status(400).json({ error: 'Invalid user or role' });
        }

        const validPassword = await bcrypt.compare(loginPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, enrollment: user.enrollment, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, enrollment: user.enrollment, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

/* --- Auth / Profile Routes --- */
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, enrollment, email, role, balance FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch (error) {
        console.error("Auth Me Error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

/* --- Menu Routes --- */
app.get('/api/menu', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM menu_items');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

/* --- Order Routes --- */

app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { items, pickupTime, notes, total } = req.body;
        const userId = req.user.id;
        
        if (!items || items.length === 0 || !pickupTime || !total) {
            return res.status(400).json({ error: 'Missing required order fields' });
        }

        const userResult = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
        const userRec = userResult.rows[0];
        if (!userRec || userRec.balance < total) {
            return res.status(400).json({ error: 'Insufficient Wallet Funds!', required: total, current: userRec?.balance });
        }

        const token = `PUC-${Math.floor(Math.random() * 900 + 100)}`;

        // Transaction handling (basic)
        await pool.query('BEGIN');
        await pool.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [total, userId]);
        const orderResult = await pool.query(
            'INSERT INTO orders (user_id, token, pickup_time, notes, total) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [userId, token, pickupTime, notes, total]
        );
        const orderId = orderResult.rows[0].id;

        for (const item of items) {
            await pool.query(
                'INSERT INTO order_items (order_id, item_name, qty, price) VALUES ($1, $2, $3, $4)',
                [orderId, item.name, item.qty, item.price]
            );
        }
        await pool.query('COMMIT');

        res.status(201).json({ message: 'Order placed successfully', token, orderId });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Order Error:', error);
        res.status(500).json({ error: 'Failed to place order: ' + error.message });
    }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        const orders = result.rows;
        
        for (let order of orders) {
            const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
            order.items = itemsResult.rows;
            order.student = req.user.enrollment;
            order.enrollment = req.user.enrollment;
        }

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// --- ADMIN ROUTES ---
const isAdmin = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];
        if (user && user.role === 'Admin') {
            next();
        } else {
            res.status(403).json({ error: 'Access denied: Requires Admin privileges' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Server error verifying role' });
    }
};

app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT orders.*, users.name as student, users.enrollment 
            FROM orders 
            JOIN users ON orders.user_id = users.id 
            ORDER BY orders.created_at DESC
        `);
        const orders = result.rows;
        for (let order of orders) {
            const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
            order.items = itemsRes.rows;
        }
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admin orders' });
    }
});

app.put('/api/admin/orders/:id/status', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Pending', 'Preparing', 'Ready', 'Completed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ message: 'Order status updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Initialize DB and start server
setupDatabase().then(() => {
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    }
}).catch(err => {
    console.error('Failed to initialize database', err);
});

module.exports = app;

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { setupDatabase, getDbConnection } = require('./db.js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super_secret_jwt_key_smart_canteen_123'; // In production use environment variable

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname)));

let db;

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

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

        // Check if user already exists
        const existingUser = await db.get('SELECT * FROM users WHERE enrollment = ? OR email = ?', [signupId, signupEmail]);
        if (existingUser) {
            return res.status(400).json({ error: 'User with this enrollment or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(signupPassword, 10);
        
        const result = await db.run(
            'INSERT INTO users (name, enrollment, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [signupName, signupId, signupEmail, hashedPassword, signupRole]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.lastID });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { loginId, loginPassword, role } = req.body;

        const user = await db.get('SELECT * FROM users WHERE (enrollment = ? OR email = ?) AND role = ?', [loginId, loginId, role]);
        
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
        const user = await db.get('SELECT id, name, enrollment, email, role, balance FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch (error) {
        console.error("Auth Me Error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

/* --- Menu Routes --- */
// Get all menu items
app.get('/api/menu', async (req, res) => {
    try {
        const items = await db.all('SELECT * FROM menu_items');
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

/* --- Order Routes --- */

// Place an order
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { items, pickupTime, notes, total } = req.body;
        const userId = req.user.id;
        
        if (!items || items.length === 0 || !pickupTime || !total) {
            return res.status(400).json({ error: 'Missing required order fields' });
        }

        // Check Wallet Balance
        const userRec = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
        if (!userRec || userRec.balance < total) {
            return res.status(400).json({ error: 'Insufficient Wallet Funds! Please top up.', required: total, current: userRec?.balance });
        }

        const token = `PUC-${Math.floor(Math.random() * 900 + 100)}`;

        // Deduct balance from wallet
        await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [total, userId]);

        // Insert the order
        const orderResult = await db.run(
            'INSERT INTO orders (user_id, token, pickup_time, notes, total) VALUES (?, ?, ?, ?, ?)',
            [userId, token, pickupTime, notes, total]
        );

        const orderId = orderResult.lastID;

        // Insert each item
        for (const item of items) {
            await db.run(
                'INSERT INTO order_items (order_id, item_name, qty, price) VALUES (?, ?, ?, ?)',
                [orderId, item.name, item.qty, item.price]
            );
        }

        res.status(201).json({ message: 'Order placed successfully', token, orderId });
    } catch (error) {
        console.error('Order Error:', error);
        res.status(500).json({ error: 'Failed to place order: ' + error.message });
    }
});

// Get user orders
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const orders = await db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        
        // Fetch items for each order
        for (let order of orders) {
            const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
            order.items = items;
            order.student = req.user.enrollment; // Attach enrollment as student identifier
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
        const user = await db.get('SELECT role FROM users WHERE id = ?', [req.user.id]);
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
        const orders = await db.all(`
            SELECT orders.*, users.name as student, users.enrollment 
            FROM orders 
            JOIN users ON orders.user_id = users.id 
            ORDER BY orders.created_at DESC
        `);
        
        for (let order of orders) {
            order.items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
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
        await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Order status updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});
// --------------------

// Initialize DB and start server
setupDatabase().then((database) => {
    db = database;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database', err);
});

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Configure database connection
// In Vercel, we use process.env.DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Neon/Supabase
    }
});

const menuItemsSeed = [
    // PU Canteen
    { name: "Chocolate Cheese Sandwich", category: "Sandwich", price: 50, outlet: "PU Canteen", image: "https://images.unsplash.com/photo-1528736235302-52922df5c122?auto=format&fit=crop&w=800&q=80", description: "Sweet and savory chocolate cheese sandwich." },
    { name: "Aloo Bhujia Grilled Sandwich", category: "Sandwich", price: 30, outlet: "PU Canteen", image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80", description: "Spicy aloo bhujia mix grilled to perfection." },
    { name: "Schezwan Grilled Sandwich", category: "Sandwich", price: 30, outlet: "PU Canteen", image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80", description: "Spicy schezwan sauce loaded sandwich." },
    { name: "Paneer Puff", category: "Bakery", price: 40, outlet: "PU Canteen", image: "https://aromaticessence.co/wp-content/uploads/2022/08/paneer_puff_featured-500x500.jpg", description: "Flaky puff pastry stuffed with spiced paneer." },
    { name: "Spring Roll", category: "Rolls", price: 60, outlet: "PU Canteen", image: "https://www.cubesnjuliennes.com/wp-content/uploads/2021/01/Spring-Roll-Recipe.jpg", description: "Crispy fried rolls filled with fresh julienned vegetables." },
    { name: "Samosa", category: "Snacks", price: 15, outlet: "PU Canteen", image: "https://www.cubesnjuliennes.com/wp-content/uploads/2020/08/Best-Indian-Punjabi-Samosa-Recipe.jpg", description: "Crispy Punjabi samosa with spiced potato filling." },
    
    // Cafe Gram
    { name: "Margherita Pizza", category: "Pizza", price: 160, outlet: "Cafe Gram", image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80", description: "Classic cheese and tomato pizza." },
    { name: "Gram Special Aloo Tikki Burger", category: "Burger", price: 150, outlet: "Cafe Gram", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80", description: "Signature crispy aloo tikki burger." },
    { name: "Paneer Makhani Pizza", category: "Pizza", price: 240, outlet: "Cafe Gram", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80", description: "Rich paneer makhani topped on a fresh pizza crust." },
    { name: "Chilli Garlic Noodles", category: "Noodle Bar", price: 120, outlet: "Cafe Gram", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80", description: "Spicy chilli garlic wok-tossed noodles." },
    { name: "Classic Hot Chocolate", category: "Hot Chocolate", price: 100, outlet: "Cafe Gram", image: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=800&q=80", description: "Rich, warm, and comforting hot chocolate." },
    { name: "Butter Croissant", category: "Desserts", price: 120, outlet: "Cafe Gram", image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80", description: "Flaky, buttery, freshly baked croissant." },

    // Cibus Cafe
    { name: "Plain Maggi", category: "Maggi and Poha", price: 30, outlet: "Cibus Cafe", image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=800&q=80", description: "Everyone's favorite classic plain Maggi." },
    { name: "Aloo Paratha", category: "Paratha Hut", price: 80, outlet: "Cibus Cafe", image: "https://www.kingarthurbaking.com/sites/default/files/2025-07/Aloo-Paratha-_2025_Lifestyle_H_2435.jpg", description: "Stuffed potato paratha, served hot." },
    { name: "Plain Dosa", category: "South Indian", price: 60, outlet: "Cibus Cafe", image: "https://www.awesomecuisine.com/wp-content/uploads/2009/06/Plain-Dosa.jpg", description: "Crispy South Indian dosa served with chutney." },
    { name: "Choley Bhatura", category: "Combo Meals", price: 90, outlet: "Cibus Cafe", image: "https://static.toiimg.com/thumb/53314156.cms?imgsize=1762111&width=800&height=800", description: "Spicy chickpea curry with fluffy bhatura." },
    { name: "Veg. Momos", category: "Chinese Food", price: 100, outlet: "Cibus Cafe", image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80", description: "Soft steamed momos with spicy dip." },
    { name: "Kulhad Chai", category: "Hot Warm Up", price: 20, outlet: "Cibus Cafe", image: "https://b.zmtcdn.com/data/dish_photos/891/24885319d5db82a2794a629764b5b891.jpg", description: "Traditional spiced tea served in an earthen cup." }
];

// Initialize database schema
async function setupDatabase() {
    const client = await pool.connect();
    try {
        // Create Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT,
                enrollment TEXT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'Student',
                balance INTEGER DEFAULT 500,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed Users if empty
        const { rows: uRows } = await client.query('SELECT COUNT(*) as count FROM users');
        if (parseInt(uRows[0].count) === 0) {
            console.log("Seeding test users...");
            const hashedPw = await bcrypt.hash("password123", 10);
            await client.query('INSERT INTO users (name, enrollment, email, password, role, balance) VALUES ($1, $2, $3, $4, $5, $6)', 
                ["Test Student", "TEST1234", "student@test.com", hashedPw, "Student", 1000]);
            await client.query('INSERT INTO users (name, enrollment, email, password, role, balance) VALUES ($1, $2, $3, $4, $5, $6)', 
                ["Canteen Admin", "ADMIN001", "admin@test.com", hashedPw, "Admin", 9999]);
        }

        // 2. Create Outlets table
        await client.query(`
            CREATE TABLE IF NOT EXISTS outlets (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL
            );
        `);

        // Seed Outlets if empty
        const initialOutlets = ["PU Canteen", "Cafe Gram", "Cibus Cafe"];
        for (const oName of initialOutlets) {
            await client.query('INSERT INTO outlets (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [oName]);
        }

        // 3. Create Menu Items table (Harden schema)
        await client.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price INTEGER NOT NULL,
                outlet_id INTEGER NOT NULL REFERENCES outlets(id),
                image TEXT NOT NULL,
                description TEXT,
                is_best_seller INTEGER DEFAULT 0,
                is_available BOOLEAN DEFAULT TRUE,
                UNIQUE(name, outlet_id)
            );
        `);

        // Create Orders table
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                token TEXT NOT NULL,
                pickup_time TEXT NOT NULL,
                notes TEXT,
                total INTEGER NOT NULL,
                status TEXT DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create Order Items table
        await client.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id),
                item_name TEXT NOT NULL,
                qty INTEGER NOT NULL,
                price INTEGER NOT NULL
            );
        `);

        // Seed menu items robustly
        console.log("Synchronizing stable menu data...");
        const { rows: existingOutlets } = await client.query('SELECT id, name FROM outlets');
        const outletMap = existingOutlets.reduce((acc, row) => {
            acc[row.name] = row.id;
            return acc;
        }, {});

        // Begin Transaction for resilient seeding
        await client.query('BEGIN');
        let seededCount = 0;

        for (const item of menuItemsSeed) {
            const outletId = outletMap[item.outlet];
            if (!outletId) continue;

            const isBest = ['Gram Special Aloo Tikki Burger', 'Margherita Pizza', 'Spring Roll', 'Kulhad Chai'].includes(item.name) ? 1 : 0;
            
            await client.query(`
                INSERT INTO menu_items (name, category, price, outlet_id, image, description, is_best_seller, is_available)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (name, outlet_id) DO UPDATE SET
                    category = EXCLUDED.category,
                    price = EXCLUDED.price,
                    image = EXCLUDED.image,
                    description = EXCLUDED.description,
                    is_best_seller = EXCLUDED.is_best_seller
            `, [item.name, item.category, item.price, outletId, item.image, item.description, isBest, true]);
            seededCount++;
        }
        
        await client.query('COMMIT');
        console.log(`Database persistent state verified. Seeded/Updated ${seededCount} items.`);
    } catch (err) {
        console.error("Database setup error:", err);
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    setupDatabase
};

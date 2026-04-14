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
    { name: "Schezwan Grilled Sandwich", category: "Sandwich", price: 30, outlet: "PU Canteen", image: "https://upload.wikimedia.org/wikipedia/commons/4/48/Toasted_ham_sandwich.jpg", description: "Spicy schezwan sauce loaded sandwich." },
    { name: "Paneer Puff", category: "Bakery", price: 40, outlet: "PU Canteen", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80", description: "Flaky puff pastry stuffed with spiced paneer." },
    { name: "Spring Roll", category: "Rolls", price: 60, outlet: "PU Canteen", image: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=800&q=80", description: "Crispy fried rolls filled with fresh julienned vegetables." },
    
    // Cafe Gram
    { name: "Margherita Pizza", category: "Pizza", price: 160, outlet: "Cafe Gram", image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80", description: "Classic cheese and tomato pizza." },
    { name: "Gram Special Aloo Tikki Burger", category: "Burger", price: 150, outlet: "Cafe Gram", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80", description: "Signature crispy aloo tikki burger." },
    { name: "Paneer Makhani Pizza", category: "Pizza", price: 240, outlet: "Cafe Gram", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80", description: "Rich paneer makhani topped on a fresh pizza crust." },
    { name: "Chilli Garlic Noodles", category: "Noodle Bar", price: 120, outlet: "Cafe Gram", image: "https://upload.wikimedia.org/wikipedia/commons/1/13/A_bowl_of_Spring_noodles_soup.jpg", description: "Spicy chilli garlic wok-tossed noodles." },
    { name: "Classic Hot Chocolate", category: "Hot Chocolate", price: 100, outlet: "Cafe Gram", image: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=800&q=80", description: "Rich, warm, and comforting hot chocolate." },
    { name: "Butter Croissant", category: "Desserts", price: 120, outlet: "Cafe Gram", image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80", description: "Flaky, buttery, freshly baked croissant." },

    // Cibus Cafe
    { name: "Plain Maggi", category: "Maggi and Poha", price: 30, outlet: "Cibus Cafe", image: "https://upload.wikimedia.org/wikipedia/commons/1/13/A_bowl_of_Spring_noodles_soup.jpg", description: "Everyone's favorite classic plain Maggi." },
    { name: "Aloo Paratha", category: "Paratha Hut", price: 80, outlet: "Cibus Cafe", image: "https://images.unsplash.com/photo-1626779815049-36eb42817db4?auto=format&fit=crop&w=800&q=80", description: "Stuffed potato paratha, served hot." },
    { name: "Plain Dosa", category: "South Indian", price: 60, outlet: "Cibus Cafe", image: "https://images.unsplash.com/photo-1630403759714-27909dd43e67?auto=format&fit=crop&w=800&q=80", description: "Crispy South Indian dosa served with chutney." },
    { name: "Choley Bhatura", category: "Combo Meals", price: 90, outlet: "Cibus Cafe", image: "https://images.unsplash.com/photo-1626779815049-36eb42817db4?auto=format&fit=crop&w=800&q=80", description: "Spicy chickpea curry with fluffy bhatura." },
    { name: "Veg. Momos", category: "Chinese Food", price: 100, outlet: "Cibus Cafe", image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80", description: "Soft steamed momos with spicy dip." },
    { name: "Kulhad Chai", category: "Hot Warm Up", price: 20, outlet: "Cibus Cafe", image: "https://images.unsplash.com/photo-1576092768241-dec2310123f6?auto=format&fit=crop&w=800&q=80", description: "Traditional spiced tea served in an earthen cup." }
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

        // Create Menu Items table
        // First drop to clear out old data lacking the 'outlet' column
        await client.query('DROP TABLE IF EXISTS menu_items CASCADE');
        
        await client.query(`
            CREATE TABLE menu_items (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price INTEGER NOT NULL,
                outlet TEXT NOT NULL,
                image TEXT NOT NULL,
                description TEXT,
                is_best_seller INTEGER DEFAULT 0,
                is_available BOOLEAN DEFAULT TRUE
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

        // Always seed if empty after the drop
        console.log("Seeding menu items for outlets...");
        for (const item of menuItemsSeed) {
            const isBest = ['Gram Special Aloo Tikki Burger', 'Margherita Pizza', 'Spring Roll', 'Kulhad Chai'].includes(item.name) ? 1 : 0;
            // Native fallback to standard TRUE availability on fresh seed
            await client.query('INSERT INTO menu_items (name, category, price, outlet, image, description, is_best_seller, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', 
                [item.name, item.category, item.price, item.outlet, item.image, item.description, isBest, true]);
        }
        
        console.log("Database initialized successfully.");
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

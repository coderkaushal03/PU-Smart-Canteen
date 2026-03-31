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
    {
        name: "Burger",
        category: "Fast Food",
        price: 35,
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
        description: "A classic crispy aloo tikki burger with fresh veggies and our special house sauce."
    },
    {
        name: "Samosa",
        category: "Fast Food",
        price: 15,
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
        description: "Hot perfectly spiced potato and pea samosa. Served with tangy tamarind chutney."
    },
    {
        name: "Noodles",
        category: "Chinese",
        price: 50,
        image: "https://upload.wikimedia.org/wikipedia/commons/1/13/A_bowl_of_Spring_noodles_soup.jpg",
        description: "Wok-tossed Hakka noodles with crunchy cabbage, bell peppers, and savory soy sauce."
    },
    {
        name: "Hot Dog",
        category: "Fast Food",
        price: 35,
        image: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=900&q=80",
        description: "Grilled sausage inside a soft bun, topped with classic mustard and ketchup."
    },
    {
        name: "French Fries",
        category: "Chinese/Fast Food",
        price: 30,
        image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80",
        description: "Crispy golden french fries seasoned with a touch of salt. Perfectly irresistible."
    },
    {
        name: "Aloo Sandwich",
        category: "Sandwich",
        price: 30,
        image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80",
        description: "Grilled sandwich filled with hearty spiced potatoes, onions, and coriander."
    },
    {
        name: "Corn Sandwich",
        category: "Sandwich",
        price: 40,
        image: "https://upload.wikimedia.org/wikipedia/commons/4/48/Toasted_ham_sandwich.jpg",
        description: "Toasted sandwich loaded with sweet corn, cheese, and mild spices."
    },
    {
        name: "Cheese Sandwich",
        category: "Sandwich",
        price: 45,
        image: "https://images.unsplash.com/photo-1528736235302-52922df5c122?auto=format&fit=crop&w=900&q=80",
        description: "Melted cheese goodness inside perfectly buttered and toasted bread slices."
    },
    {
        name: "Cold Coffee",
        category: "Cold Beverage",
        price: 40,
        image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=80",
        description: "Thick, sweet, and creamy chilled coffee blended to perfection."
    },
    {
        name: "Diet Coke",
        category: "Cold Beverage",
        price: 30,
        image: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Diet-Coke-Can.jpg",
        description: "Refreshing zero-sugar carbonated beverage served chilled."
    },
    {
        name: "Steam Momos (6pc)",
        category: "Chinese",
        price: 40,
        image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80",
        description: "Soft steamed momos stuffed with finely minced vegetables. Served with spicy red chutney."
    },
    {
        name: "Spring Roll",
        category: "Rolls",
        price: 60,
        image: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=900&q=80",
        description: "Crispy fried rolls filled with fresh julienned vegetables and noodles."
    }
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
        await client.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price INTEGER NOT NULL,
                image TEXT NOT NULL,
                description TEXT,
                is_best_seller INTEGER DEFAULT 0
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

        // Seed Menu Items if empty
        const { rows: mRows } = await client.query('SELECT COUNT(*) as count FROM menu_items');
        if (parseInt(mRows[0].count) === 0) {
            console.log("Seeding menu items...");
            for (const item of menuItemsSeed) {
                const isBest = ['Burger', 'Cold Coffee', 'Spring Roll', 'Steam Momos (6pc)'].includes(item.name) ? 1 : 0;
                await client.query('INSERT INTO menu_items (name, category, price, image, description, is_best_seller) VALUES ($1, $2, $3, $4, $5, $6)', 
                    [item.name, item.category, item.price, item.image, item.description, isBest]);
            }
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

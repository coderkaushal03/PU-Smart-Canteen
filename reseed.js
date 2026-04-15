const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
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

async function run() {
    const client = await pool.connect();
    try {
        console.log("Starting manual re-seed...");
        
        // 1. Get Outlets
        const { rows: outlets } = await client.query('SELECT id, name FROM outlets');
        const outletMap = outlets.reduce((acc, o) => ({...acc, [o.name]: o.id}), {});
        console.log("Current Outlets:", outletMap);

        // 2. Perform transaction-based seed
        await client.query('BEGIN');
        for (const item of menuItemsSeed) {
            const oid = outletMap[item.outlet];
            if (!oid) {
                console.error(`Missing outlet: ${item.outlet}`);
                continue;
            }
            await client.query(`
                INSERT INTO menu_items (name, category, price, outlet_id, image, description, is_best_seller, is_available)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (name, outlet_id) DO UPDATE SET
                    category = EXCLUDED.category,
                    price = EXCLUDED.price,
                    image = EXCLUDED.image,
                    description = EXCLUDED.description
            `, [item.name, item.category, item.price, oid, item.image, item.description, 0, true]);
        }
        await client.query('COMMIT');
        
        // 3. Verify total count
        const { rows: count } = await client.query('SELECT count(*) FROM menu_items');
        console.log(`Success! Total items in DB: ${count[0].count}`);
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}

run();

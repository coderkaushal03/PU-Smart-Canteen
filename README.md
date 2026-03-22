# PU-Smart-Canteen
Here's a detailed synopsis of the **Smart Canteen** project as it stands today:

---

## 🍔 Smart Canteen — Project Synopsis

**Smart Canteen** is a full-stack web application built for **Poornima University** that allows students to pre-order food from their classroom and collect it at the canteen counter — completely eliminating queues.

---

### 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, Vanilla CSS, Vanilla JavaScript |
| **Backend** | Node.js + Express.js |
| **Database** | SQLite (via `sqlite` + `sqlite3`) |
| **Auth** | JWT (JSON Web Tokens) + bcrypt password hashing |
| **Fonts** | Space Grotesk + Playfair Display (Google Fonts) |

---

### 📁 File Structure

```
smart canteen/
├── smartcanteen.html   → Main student portal
├── login.html          → Login page (Student + Admin)
├── signup.html         → New student registration
├── order.html          → Legacy order form (kept for compatibility)
├── admin.html          → Canteen Staff / Admin Dashboard
├── script.js           → All frontend logic
├── style.css           → Full design system + animations
├── server.js           → Node.js REST API
└── db.js               → Database schema + seeding
```

---

### ✨ Core Features

#### 1. 🔐 User Authentication
- Students register with name, enrollment ID, email & password.
- Login supports both **Enrollment ID** or **Email** as identifier.
- Passwords are **bcrypt hashed** in the database.
- Sessions use **JWT tokens** stored in `localStorage`.
- Separate roles: **Student**, **Faculty**, **Canteen Staff/Admin**.
- After login, Admin users are **automatically redirected** to the Admin Dashboard.

#### 2. 💳 Closed-Loop Student Wallet
- Every student has an internal wallet with a starting balance (Rs 500 for new accounts, Rs 1000 for test accounts).
- When an order is placed, the total is **atomically deducted** from the student's wallet in a database transaction.
- If funds are insufficient, the order is **rejected** with a clear error message.
- The **live wallet balance** is always shown in the topbar (e.g., `Wallet: Rs 450`).

#### 3. 🔍 Live Search & Category Filters
- A **search bar** filters menu items in real-time by name or description.
- **Category chips** (All, Fast Food, Chinese, Sandwich, Beverages, Rolls) allow instant menu filtering.
- Both filters work together simultaneously.

#### 4. 🛒 Floating Cart & Side Drawer
- A **floating action button** (FAB) in the bottom-right corner shows the live cart item count.
- Clicking it opens a **smooth-sliding side drawer** containing the full cart.
- Students pick items directly from menu cards with **"Add to Cart"** buttons.
- The drawer includes a **Pickup Time dropdown**, optional cooking notes, and the order total.
- Checkout is a single **"Pay via Wallet"** button — no external payment gateway needed.

#### 5. 🟢 Live Order Status Tracking
- After placing an order, a graphical progress widget appears on the student portal.
- Shows real-time order progression: **Pending → Preparing → Ready → Completed**.
- The active step has a **pulsing blue animation**.
- The page **automatically polls** the server every 5 seconds for live updates.

#### 6. 👨‍🍳 Admin / Canteen Staff Dashboard ([admin.html](cci:7://file:///Users/kaushalsharma/Downloads/smart%20canteen/admin.html:0:0-0:0))
- A dedicated dark-mode **Kanban board** for canteen staff.
- Three columns: **🟡 Pending**, **🔵 Preparing**, **🟢 Ready for Pickup**.
- Each order card shows the student's name, enrollment ID, item list with prices, pickup time, and any cooking notes.
- Staff advance orders with a single click (e.g., "Start Cooking ➜").
- The dashboard **auto-refreshes every 5 seconds**.
- Protected by a role-check middleware — non-admins get a `403 Forbidden` response.

#### 7. ⭐ Best Sellers Section
- Items flagged as `is_best_seller` in the DB are **automatically promoted** to the top of the page in a dedicated grid.
- Currently featured: Burger, Cold Coffee, Spring Roll, Steam Momos.

---

### 🗃️ Database Schema

| Table | Key Columns |
|---|---|
| `users` | id, name, enrollment, email, password, role, **balance** |
| `menu_items` | id, name, category, price, image, description, **is_best_seller** |
| `orders` | id, user_id, token, pickup_time, notes, total, **status** |
| `order_items` | id, order_id, item_name, qty, price |

---

### 🧪 Test Credentials

| Role | Email | Password |
|---|---|---|
| Student | `student@test.com` | `password123` |
| Admin | `admin@test.com` | `password123` |

---

### 🚀 How to Run

```bash
cd "smart canteen"
node server.js
# Open http://localhost:3000/smartcanteen.html
```

---

This is a complete, production-ready-style canteen management system — covering the full lifecycle from student ordering to canteen staff fulfillment, all running locally without any third-party payment gateway.

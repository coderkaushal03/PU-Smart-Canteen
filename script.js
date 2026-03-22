let allMenuItems = []; // Holds fetched menu items
let currentCategory = "All";
let searchQuery = "";

const menuGrid = document.getElementById("menuGrid");
// Legacy form elements removed for V2 SPA layout
const cartList = document.getElementById("cartList");
const ordersList = document.getElementById("ordersList");

const cartStorageKey = "smartCanteenCart";
let cart = [];

const fallbackImage =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='900' height='600'>" +
        "<rect width='100%' height='100%' fill='#e5e7eb'/>" +
        "<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' " +
        "font-family='Segoe UI, sans-serif' font-size='42' fill='#374151'>Food Image</text>" +
        "</svg>"
    );

function getItemPriceByName(name) {
    const found = allMenuItems.find((item) => item.name === name);
    return found ? found.price : 0;
}

function loadCart() {
    return JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
}

function saveCart() {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
}

async function renderMenu() {
    if (!menuGrid) {
        return;
    }

    // Fetch menu items only once
    if (allMenuItems.length === 0) {
        try {
            const response = await fetch("http://localhost:3000/api/menu");
            if (response.ok) {
                allMenuItems = await response.json();
                filterAndDisplay();
            } else {
                loadFallbackMenu();
            }
        } catch (e) {
            // Backend not running (e.g., GitHub Pages) — use static fallback
            loadFallbackMenu();
        }
    } else {
        filterAndDisplay();
    }
}

function loadFallbackMenu() {
    allMenuItems = [
        { id:1, name:"Burger", category:"Fast Food", price:35, is_best_seller:1, description:"A classic crispy aloo tikki burger with fresh veggies and our special house sauce.", image:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80" },
        { id:2, name:"Samosa", category:"Fast Food", price:15, is_best_seller:0, description:"Hot perfectly spiced potato and pea samosa. Served with tangy tamarind chutney.", image:"https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80" },
        { id:3, name:"Noodles", category:"Chinese", price:50, is_best_seller:0, description:"Wok-tossed Hakka noodles with crunchy cabbage, bell peppers, and savory soy sauce.", image:"https://upload.wikimedia.org/wikipedia/commons/1/13/A_bowl_of_Spring_noodles_soup.jpg" },
        { id:4, name:"Hot Dog", category:"Fast Food", price:35, is_best_seller:0, description:"Grilled sausage inside a soft bun, topped with classic mustard and ketchup.", image:"https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=900&q=80" },
        { id:5, name:"French Fries", category:"Fast Food", price:30, is_best_seller:0, description:"Crispy golden french fries seasoned with a touch of salt.", image:"https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80" },
        { id:6, name:"Aloo Sandwich", category:"Sandwich", price:30, is_best_seller:0, description:"Grilled sandwich filled with hearty spiced potatoes, onions, and coriander.", image:"https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80" },
        { id:7, name:"Corn Sandwich", category:"Sandwich", price:40, is_best_seller:0, description:"Toasted sandwich loaded with sweet corn, cheese, and mild spices.", image:"https://upload.wikimedia.org/wikipedia/commons/4/48/Toasted_ham_sandwich.jpg" },
        { id:8, name:"Cheese Sandwich", category:"Sandwich", price:45, is_best_seller:0, description:"Melted cheese goodness inside perfectly buttered and toasted bread slices.", image:"https://images.unsplash.com/photo-1528736235302-52922df5c122?auto=format&fit=crop&w=900&q=80" },
        { id:9, name:"Cold Coffee", category:"Cold Beverage", price:40, is_best_seller:1, description:"Thick, sweet, and creamy chilled coffee blended to perfection.", image:"https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=80" },
        { id:10, name:"Diet Coke", category:"Cold Beverage", price:30, is_best_seller:0, description:"Refreshing zero-sugar carbonated beverage served chilled.", image:"https://upload.wikimedia.org/wikipedia/commons/3/3c/Diet-Coke-Can.jpg" },
        { id:11, name:"Steam Momos (6pc)", category:"Chinese", price:40, is_best_seller:1, description:"Soft steamed momos stuffed with finely minced vegetables. Served with spicy red chutney.", image:"https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80" },
        { id:12, name:"Spring Roll", category:"Rolls", price:60, is_best_seller:1, description:"Crispy fried rolls filled with fresh julienned vegetables and noodles.", image:"https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=900&q=80" }
    ];
    filterAndDisplay();
}

function filterAndDisplay() {
    const filtered = allMenuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery) || (item.description || '').toLowerCase().includes(searchQuery);
        let matchesCategory = true;
        if (currentCategory !== "All") {
            matchesCategory = item.category.includes(currentCategory);
        }
        return matchesSearch && matchesCategory;
    });
    displayMenuItems(filtered);
}

// Ensure the original rendering logic accepts arbitrary arrays
function displayMenuItems(menuItems) {
    const bestSellersGrid = document.getElementById("bestSellersGrid");
    if(bestSellersGrid) bestSellersGrid.innerHTML = "";
    menuGrid.innerHTML = "";
    menuItems.forEach((item) => {
        const card = document.createElement("article");
        card.className = "menu-card";
        card.innerHTML = `
            <div class="menu-img-wrap">
                <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null;this.src='${fallbackImage}'">
                <div class="menu-desc">
                    <p>${item.description || "A delicious item from our menu."}</p>
                </div>
            </div>
            <div class="menu-body">
                <h3>${item.name}</h3>
                <div class="menu-meta">
                    <span class="menu-cat">${item.category}</span>
                    <span class="menu-price">Rs ${item.price}</span>
                </div>
                <button type="button" class="pick-btn">Add to Cart</button>
            </div>
        `;

        const pickButton = card.querySelector(".pick-btn");
        if(pickButton) {
            pickButton.addEventListener("click", () => {
                addItemToCartDirectly(item.name, 1, pickButton);
            });
        }

        if(menuGrid) menuGrid.appendChild(card);
        
        if (item.is_best_seller && bestSellersGrid) {
            const bestCard = card.cloneNode(true);
            const bestPickBtn = bestCard.querySelector(".pick-btn");
            if(bestPickBtn) {
                bestPickBtn.addEventListener("click", () => {
                    addItemToCartDirectly(item.name, 1, bestPickBtn);
                });
            }
            bestSellersGrid.appendChild(bestCard);
        }
    });
}

function updateBill() {
    // Deprecated in V2
}

function renderCart() {
    if (cartList) {
        cartList.innerHTML = "";
        if (cart.length === 0) {
            cartList.innerHTML = "<li>No items added yet.</li>";
        } else {
            cart.forEach((entry, index) => {
                const li = document.createElement("li");
                li.className = "cart-item";
                li.innerHTML = `
                    <span>${entry.name} x ${entry.qty} = Rs ${entry.subtotal}</span>
                    <button type="button" class="remove-btn" data-index="${index}">Remove</button>
                `;
                cartList.appendChild(li);
            });
            cartList.querySelectorAll(".remove-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    cart.splice(Number(btn.dataset.index), 1);
                    renderCart();
                });
            });
        }
    }

    const drawerCartList = document.getElementById("drawerCartList");
    const drawerTotalBox = document.getElementById("drawerTotalBox");
    const cartCountBadge = document.getElementById("cartCountBadge");
    const drawerEmptyMsg = document.getElementById("drawerEmptyMsg");

    if (drawerCartList) {
        drawerCartList.innerHTML = "";
        const cartTotal = cart.reduce((sum, entry) => sum + entry.subtotal, 0);
        
        if (cartCountBadge) {
            cartCountBadge.textContent = cart.reduce((sum, entry) => sum + entry.qty, 0);
        }
        if (drawerTotalBox) {
            drawerTotalBox.textContent = `Rs ${cartTotal}`;
        }

        if (cart.length === 0) {
            if (drawerEmptyMsg) drawerEmptyMsg.style.display = "block";
        } else {
            if (drawerEmptyMsg) drawerEmptyMsg.style.display = "none";
            cart.forEach((entry, index) => {
                const li = document.createElement("li");
                li.className = "cart-item";
                li.innerHTML = `
                    <span>${entry.name} x ${entry.qty} = Rs ${entry.subtotal}</span>
                    <button type="button" class="remove-btn" data-index="${index}">Remove</button>
                `;
                drawerCartList.appendChild(li);
            });
            drawerCartList.querySelectorAll(".remove-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    cart.splice(Number(btn.dataset.index), 1);
                    renderCart();
                });
            });
        }
    }

    updateBill();
    saveCart();
}

function addItemToCartDirectly(itemName, qty = 1, btnEl = null) {
    if (!itemName) return;
    const price = getItemPriceByName(itemName);
    const existing = cart.find((entry) => entry.name === itemName);

    if (existing) {
        existing.qty += qty;
        existing.subtotal = existing.qty * existing.price;
    } else {
        cart.push({
            name: itemName,
            price,
            qty,
            subtotal: price * qty
        });
    }

    renderCart();
    showToast(`Added ${itemName} to your cart!`);

    // ---- Animations ----
    if (btnEl) {
        // 1. Button bounce + text change
        const originalText = btnEl.textContent;
        btnEl.textContent = "✓ Added!";
        btnEl.classList.add("added");
        setTimeout(() => {
            btnEl.textContent = originalText;
            btnEl.classList.remove("added");
        }, 900);

        // 2. Flying particle towards cart FAB
        const fab = document.getElementById("cartFab");
        if (fab) {
            const btnRect = btnEl.getBoundingClientRect();
            const fabRect = fab.getBoundingClientRect();

            const particle = document.createElement("div");
            particle.className = "fly-particle";
            particle.style.left = `${btnRect.left + btnRect.width / 2 - 7}px`;
            particle.style.top  = `${btnRect.top + btnRect.height / 2 - 7}px`;

            const dx = fabRect.left + fabRect.width / 2 - (btnRect.left + btnRect.width / 2);
            const dy = fabRect.top + fabRect.height / 2 - (btnRect.top + btnRect.height / 2);
            particle.style.setProperty("--dx", `${dx}px`);
            particle.style.setProperty("--dy", `${dy}px`);

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 700);

            // 3. FAB pop
            fab.style.transform = "scale(1.35)";
            setTimeout(() => fab.style.transform = "", 300);
        }
    }
}

async function renderOrders() {
    const ordersListElement = document.getElementById("ordersList");
    if (!ordersListElement) return;
    
    try {
        const tokenCache = localStorage.getItem("smartCanteenToken");
        if(!tokenCache) return;

        const response = await fetch("http://localhost:3000/api/orders", {
            headers: { "Authorization": `Bearer ${tokenCache}` }
        });

        if (response.ok) {
            const orders = await response.json();
            ordersListElement.innerHTML = "";

            if (orders.length === 0) {
                ordersListElement.innerHTML = "<li style='padding: 20px; text-align: center; color: var(--muted);'>No active orders. Add an item from the menu to start.</li>";
                return;
            }

            orders.slice(0, 4).forEach((order) => {
                const li = document.createElement("li");
                li.className = "order-item-card";

                let itemsSummary = '';
                if (Array.isArray(order.items)) {
                    itemsSummary = order.items.map((item) => `${item.qty}x ${item.item_name}`).join(", ");
                } else {
                    itemsSummary = `${order.qty || 1}x ${order.item || 'Custom'}`;
                }

                const statuses = ['Pending', 'Preparing', 'Ready', 'Completed'];
                const currentIndex = statuses.indexOf(order.status || 'Pending');
                
                let progressHtml = '<div class="progress-bar"><div class="progress-line"></div>';
                statuses.forEach((s, i) => {
                    let dotClass = '';
                    if (i < currentIndex) dotClass = 'completed';
                    if (i === currentIndex) dotClass = 'active';
                    progressHtml += `
                        <div class="step ${dotClass}">
                            <div class="dot-circle"></div>
                            <span class="step-label">${s}</span>
                        </div>
                    `;
                });
                progressHtml += '</div>';

                li.innerHTML = `
                    <div class="order-header">
                        <span class="token-badge">${order.token}</span>
                        <span class="order-amount">Rs ${order.total}</span>
                    </div>
                    <div class="order-items-summary">${itemsSummary}</div>
                    <div class="order-meta">Pickup slot: ${order.pickup_time}</div>
                    ${progressHtml}
                `;
                ordersListElement.appendChild(li);
            });
        }
    } catch (e) {
        console.error("Failed to fetch orders:", e);
    }
}
setInterval(renderOrders, 5000);

cart = loadCart();

// Legacy form listeners removed for V2 Drawer UX

renderMenu();
renderCart();
renderOrders();

async function checkAuthStatus() {
    const token = localStorage.getItem("smartCanteenToken");
    const authLink = document.getElementById("authLink");
    
    if (token && authLink) {
        try {
            const response = await fetch("http://localhost:3000/api/auth/me", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const { user } = await response.json();
                localStorage.setItem("smartCanteenUser", JSON.stringify(user));
                authLink.outerHTML = `
                    <div class="auth-controls">
                        <div class="user-auth-badge wallet-pill">
                            <span style="font-weight:700">Wallet: Rs ${user.balance}</span>
                        </div>
                        <div class="user-auth-badge welcome-pill">
                            <span class="user-name">Welcome, ${user.name || user.enrollment || user.email || 'Student'}</span>
                        </div>
                        <button id="logoutBtn" class="user-auth-badge logout-pill">Logout</button>
                    </div>
                `;
                document.getElementById("logoutBtn").addEventListener("click", () => {
                    localStorage.removeItem("smartCanteenToken");
                    localStorage.removeItem("smartCanteenUser");
                    window.location.reload();
                });
            } else {
                localStorage.removeItem("smartCanteenToken");
            }
        } catch(e) { console.error(e); }
    }
}
checkAuthStatus();

// Toast UI Utility
function showToast(message) {
    let toast = document.getElementById("cartToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "cartToast";
        toast.className = "toast-popup";
        toast.innerHTML = `
            <svg class="toast-icon" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"/>
            </svg>
            <span id="toastMsg"></span>
        `;
        document.body.appendChild(toast);
    }
    
    document.getElementById("toastMsg").textContent = message;
    
    toast.classList.remove("show");
    void toast.offsetWidth; 
    toast.classList.add("show");
    
    if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
    
    toast.hideTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// Search and Filter Listeners
const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        filterAndDisplay();
    });
}

const categoryChips = document.getElementById("categoryChips");
if (categoryChips) {
    categoryChips.addEventListener("click", (e) => {
        if (e.target.classList.contains("chip")) {
            categoryChips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
            e.target.classList.add("active");
            currentCategory = e.target.dataset.category;
            filterAndDisplay();
        }
    });
}

// Drawer Toggle Logic
const cartFab = document.getElementById("cartFab");
const cartDrawer = document.getElementById("cartDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");

function toggleDrawer(forceClose = false) {
    if(!cartDrawer || !drawerOverlay) return;
    if(forceClose || cartDrawer.classList.contains("open")) {
        cartDrawer.classList.remove("open");
        drawerOverlay.classList.remove("show");
    } else {
        cartDrawer.classList.add("open");
        drawerOverlay.classList.add("show");
    }
}

if(cartFab) cartFab.addEventListener("click", () => toggleDrawer());
if(closeDrawerBtn) closeDrawerBtn.addEventListener("click", () => toggleDrawer(true));
if(drawerOverlay) drawerOverlay.addEventListener("click", () => toggleDrawer(true));

// Drawer Checkout Form
const drawerCheckoutForm = document.getElementById("drawerCheckoutForm");
if (drawerCheckoutForm) {
    drawerCheckoutForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const drawerErrorMsg = document.getElementById("drawerErrorMsg");
        const submitBtn = document.getElementById("drawerCheckoutBtn");

        if (cart.length === 0) {
            if(drawerErrorMsg) drawerErrorMsg.textContent = "Your cart is empty.";
            return;
        }

        const pickupTime = document.getElementById("drawerPickupTime").value;
        const notes = document.getElementById("drawerNotes").value.trim();
        
        try {
            const tokenCache = localStorage.getItem("smartCanteenToken");
            if (!tokenCache) {
                showToast("You must log in to place an order.");
                toggleDrawer(true);
                setTimeout(() => window.location.href = "login.html", 1000);
                return;
            }

            if(submitBtn) submitBtn.classList.add("btn-loading");
            if(drawerErrorMsg) drawerErrorMsg.textContent = "";

            const cartTotalCost = cart.reduce((acc, curr) => acc + curr.subtotal, 0);
            
            const response = await fetch("http://localhost:3000/api/orders", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenCache}`
                },
                body: JSON.stringify({ 
                    items: cart,
                    pickupTime: pickupTime, 
                    notes: notes, 
                    total: cartTotalCost
                })
            });

            const data = await response.json();
            if (response.ok) {
                cart = [];
                renderCart();
                toggleDrawer(true);
                showToast(`Order confirmed! Rs ${cartTotalCost} deducted.`);
                renderOrders(); 
                // Wait briefly then refresh auth status (and wallet balance)
                setTimeout(() => window.location.reload(), 1500);
            } else {
                if(drawerErrorMsg) drawerErrorMsg.textContent = data.error || "Failed to place order.";
            }
        } catch (error) {
            if(drawerErrorMsg) drawerErrorMsg.textContent = "Network error while placing order.";
        } finally {
            if(submitBtn) submitBtn.classList.remove("btn-loading");
        }
    });
}

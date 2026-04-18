let allMenuItems = []; // Holds fetched menu items
let currentCategory = "All";
let currentOutlet = "All";
let searchQuery = "";

// Auto-detect server address
// 1. If on localhost -> use localhost:3000
// 2. If on a LAN IP -> use that IP:3000
// 3. If on production (e.g. Render) -> use the current origin
const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:3000"
    : (window.location.hostname.match(/\d+\.\d+\.\d+\.\d+/) 
        ? `http://${window.location.hostname}:3000` 
        : window.location.origin);

let lastOrderStatuses = {}; // For tracking state changes across polling

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon mapping
    const icons = {
        'success': '✅',
        'info': '🔔',
        'warning': '⚠️',
        'error': '❌'
    };
    
    const titles = {
        'success': 'Success',
        'info': 'Order Update',
        'warning': 'Notice',
        'error': 'Error'
    };

    const icon = icons[type] || icons.success;
    const title = titles[type] || titles.success;

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="toast-close" title="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').onclick = () => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 400);
    };

    container.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 400);
        }
    }, 4500);
}

const menuGrid = document.getElementById("menuGrid");
// Legacy form elements removed for V2 SPA layout
const cartList = document.getElementById("cartList");
const ordersList = document.getElementById("ordersList");

const cartStorageKey = "smartCanteenCart";
let cart = [];

const fallbackImage =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>
            <rect width='100%' height='100%' fill='#f1f5f9'/>
            <path d='M170 120h60a10 10 0 0 1 10 10v40a10 10 0 0 1-10 10h-60a10 10 0 0 1-10-10v-40a10 10 0 0 1 10-10z' fill='#cbd5e1'/>
            <circle cx='200' cy='150' r='20' fill='#94a3b8'/>
            <text x='50%' y='210' text-anchor='middle' font-family='system-ui' font-size='16' font-weight='600' fill='#64748b'>Delicious Food Ready</text>
        </svg>`
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
            const response = await fetch(`${API_BASE}/api/menu`);
            if (response.ok) {
                allMenuItems = await response.json();
                filterAndDisplay();
            } else {
                console.error("Failed to load live menu. Check server status.");
            }
        } catch (e) {
            console.error("Connection to backend failed. Live menu unavailable.", e);
        }
    } else {
        filterAndDisplay();
    }
}

function filterAndDisplay(term = "") {
    const hideStock = document.getElementById("hideStockToggle")?.checked;
    const search = term.toLowerCase().trim();

    const filtered = allMenuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search) || (item.description || '').toLowerCase().includes(search);
        const matchesCategory = currentCategory === "All" || item.category === currentCategory;
        
        let matchesOutlet = true;
        if (currentOutlet !== "All") {
            matchesOutlet = item.outlet === currentOutlet;
        }

        const matchesStock = hideStock ? item.is_available === true : true;

        return matchesSearch && matchesCategory && matchesOutlet && matchesStock;
    });

    // Update dynamic headline
    const headerTitle = document.getElementById("menuHeaderTitle");
    if (headerTitle) {
        headerTitle.textContent = currentOutlet === "All" ? "Full Campus Menu" : `Menu from ${currentOutlet}`;
    }

    displayMenuItems(filtered);
    generateCategoryChips();
}

function generateCategoryChips() {
    const chipsContainer = document.getElementById("categoryChips");
    if (!chipsContainer) return;

    // Get categories available in current filtered outlet
    const availableItems = currentOutlet === "All" ? allMenuItems : allMenuItems.filter(i => i.outlet === currentOutlet);
    const uniqueCategories = [...new Set(availableItems.map(i => i.category))];
    
    // Sort logically or alphabetically
    uniqueCategories.sort();
    
    let chipsHtml = `<button class="chip ${currentCategory === 'All' ? 'active' : ''}" data-category="All">All</button>`;
    uniqueCategories.forEach(cat => {
        chipsHtml += `<button class="chip ${currentCategory === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>`;
    });
    
    chipsContainer.innerHTML = chipsHtml;
}

// Ensure the original rendering logic accepts arbitrary arrays
function displayMenuItems(menuItems) {
    const bestSellersGrid = document.getElementById("bestSellersGrid");
    if(bestSellersGrid) bestSellersGrid.innerHTML = "";
    menuGrid.innerHTML = "";
    menuItems.forEach((item) => {
        const card = document.createElement("article");
        const stockClass = item.is_available ? '' : 'out-of-stock';
        const stockBadge = item.is_available ? '' : '<div class="out-of-stock-badge">Out of Stock</div>';
        const btnClass = item.is_available ? '' : 'nav-disabled';
        const btnLabel = item.is_available ? 'Add to Cart' : 'Unavailable';

        card.className = `menu-card ${stockClass}`;
        card.innerHTML = `
            <div class="menu-img-wrap">
                <img class="menu-image" src="${item.image}" alt="${item.name}" onerror="this.onerror=null;this.src='${fallbackImage}'">
                ${stockBadge}
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
                <button type="button" class="pick-btn ${btnClass}" ${item.is_available ? '' : 'disabled'}>${btnLabel}</button>
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

        // Visual Sync Feedback
        const syncInd = document.getElementById('syncIndicator');
        if(syncInd) syncInd.classList.add('syncing');

        const response = await fetch(`${API_BASE}/api/orders`, {
            headers: { "Authorization": `Bearer ${tokenCache}` }
        });

        if(syncInd) {
            setTimeout(() => syncInd.classList.remove('syncing'), 800);
        }

        if (response.ok) {
            const orders = await response.json();
            
            // Notification Logic: Check for status changes
            orders.forEach(order => {
                const orderId = order.id;
                const currentStatus = order.status;
                const prevStatus = lastOrderStatuses[orderId];

                // If status changed to 'Ready', notify user!
                if (prevStatus && prevStatus !== currentStatus && currentStatus === 'Ready') {
                    showToast(`Order #${order.token} is now ready for pickup!`, 'info');
                    // Play a subtle notification sound if possible? 
                    // (Omitted for brevity, but easily added via new Audio())
                }
                
                // Update local state
                lastOrderStatuses[orderId] = currentStatus;
            });

            ordersListElement.innerHTML = "";

            if (orders.length === 0) {
                ordersListElement.innerHTML = "<li style='padding: 20px; text-align: center; color: var(--muted);'>No active orders. Add an item from the menu to start.</li>";
                return;
            }

            orders.slice(0, 1).forEach((order) => {
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

let allHistoryOrders = [];
let showAllHistory = false;

// --- Order History & Invoice System ---
async function renderOrderHistory() {
    const historyList = document.getElementById("orderHistoryList");
    const btnLoadMore = document.getElementById("btnLoadMore");
    if (!historyList) return;

    const token = localStorage.getItem("smartCanteenToken");
    if (!token) return;

    try {
        if (allHistoryOrders.length === 0) {
            const response = await fetch(`${API_BASE}/api/orders`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                allHistoryOrders = await response.json();
            }
        }

        if (allHistoryOrders.length === 0) {
            historyList.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--muted);">No previous orders found.</p>`;
            if (btnLoadMore) btnLoadMore.classList.add("hidden");
            return;
        }

        const displayOrders = showAllHistory ? allHistoryOrders : allHistoryOrders.slice(0, 3);
        
        if (btnLoadMore) {
            if (allHistoryOrders.length > 3 && !showAllHistory) {
                btnLoadMore.classList.remove("hidden");
            } else {
                btnLoadMore.classList.add("hidden");
            }
        }

        historyList.innerHTML = "";
        displayOrders.forEach(order => {
            const card = document.createElement("div");
            card.className = "history-card";
            
            const date = new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            let summary = "";
            if (Array.isArray(order.items)) {
                summary = order.items.map(i => `${i.qty}x ${i.item_name}`).join(", ");
            }

            card.innerHTML = `
                <div class="h-info">
                    <h4>Token: ${order.token}</h4>
                    <p>${summary}</p>
                    <p>${date} • Total: Rs ${order.total}</p>
                </div>
                <div class="h-actions">
                    <button class="btn-inv" onclick='viewInvoice(${JSON.stringify(order).replace(/'/g, "&apos;")})'>Invoice</button>
                    <button class="btn-re" onclick='reorder(${JSON.stringify(order.items).replace(/'/g, "&apos;")})'>Re-order</button>
                </div>
            `;
            historyList.appendChild(card);
        });
    } catch (e) { console.error("History fetch error:", e); }
}

const btnLoadMore = document.getElementById("btnLoadMore");
if (btnLoadMore) {
    btnLoadMore.addEventListener("click", () => {
        showAllHistory = true;
        renderOrderHistory();
    });
}

function reorder(items) {
    if (!items || !Array.isArray(items)) return;
    
    // Clear current cart first? Or append? Let's append but check availability
    items.forEach(oldItem => {
        // Try to find the item in current menu to get latest price/image
        const menuItem = allMenuItems.find(m => m.name === oldItem.item_name);
        if (menuItem) {
            addItemToCartDirectly(menuItem.name, oldItem.qty);
        } else {
            showToast(`Note: ${oldItem.item_name} is no longer on the menu.`);
        }
    });

    showToast("Items added to your cart!");
    toggleDrawer(); // Open drawer so they can see
}

function viewInvoice(order) {
    const modal = document.getElementById("invoiceModal");
    if (!modal) return;

    document.getElementById("invoiceToken").textContent = order.token;
    document.getElementById("invoiceTotal").textContent = `Rs ${order.total}`;
    document.getElementById("invoiceDate").textContent = new Date(order.created_at).toLocaleString();

    const itemsList = document.getElementById("invoiceItems");
    itemsList.innerHTML = "";
    
    if (order.items) {
        order.items.forEach(item => {
            const row = document.createElement("div");
            row.className = "inv-item";
            row.innerHTML = `
                <span>${item.qty}x ${item.item_name}</span>
                <span>Rs ${item.price * item.qty}</span>
            `;
            itemsList.appendChild(row);
        });
    }

    modal.classList.add("active");
}

const closeInvoiceBtn = document.getElementById("closeInvoiceBtn");
if (closeInvoiceBtn) {
    closeInvoiceBtn.addEventListener("click", () => {
        document.getElementById("invoiceModal").classList.remove("active");
    });
}
// ---------------------------------------

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
            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const { user } = await response.json();
                localStorage.setItem("smartCanteenUser", JSON.stringify(user));
                authLink.outerHTML = `
                    <div class="auth-controls">
                        <div class="user-auth-badge wallet-pill" style="display:flex; align-items:center; gap:10px;">
                            <span style="font-weight:700">Wallet: Rs ${user.balance}</span>
                            <button id="openWalletBtn" style="background: var(--brand); border: none; color: white; border-radius: 6px; padding: 2px 8px; cursor: pointer; font-size: 0.8rem; font-weight:700;">+ Top up</button>
                        </div>
                        <div class="user-auth-badge welcome-pill">
                            <span class="user-name">Welcome, ${user.name || user.enrollment || user.email || 'Student'}</span>
                        </div>
                        <button id="logoutBtn" class="user-auth-badge logout-pill">Logout</button>
                    </div>
                `;
                
                document.getElementById("openWalletBtn").addEventListener("click", () => openWalletModal());
                
                document.getElementById("logoutBtn").addEventListener("click", () => {
                    localStorage.removeItem("smartCanteenToken");
                    localStorage.removeItem("smartCanteenUser");
                    window.location.reload();
                });
                renderOrderHistory(); // Load history on login
            } else {
                localStorage.removeItem("smartCanteenToken");
            }
        } catch(e) { console.error(e); }
    }
}
checkAuthStatus();




// Search and Filter Listeners
const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        filterAndDisplay(e.target.value);
    });
}

// Hide Out Of Stock Toggle
const hideStockToggle = document.getElementById("hideStockToggle");
if(hideStockToggle) {
    hideStockToggle.addEventListener("change", () => {
        filterAndDisplay(searchInput?.value || "");
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

const outletTabs = document.getElementById("outletTabs");
if (outletTabs) {
    outletTabs.addEventListener("click", (e) => {
        const btn = e.target.closest(".outlet-card");
        if (btn) {
            outletTabs.querySelectorAll(".outlet-card").forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            currentOutlet = btn.dataset.outlet;
            currentCategory = "All"; // reset category when swiching outlets
            
            // Add a small 3D flip animation to grids when changing tabs
            const grids = document.querySelectorAll('.dynamic-3d');
            grids.forEach(g => {
                g.style.animation = 'none';
                void g.offsetWidth; // trigger reflow
                g.style.animation = 'flipIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
            });

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
        // Trigger immediate sync update when opening status/cart drawer
        renderOrders();
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
                showToast("You must log in to place an order.", "warning");
                toggleDrawer(true);
                setTimeout(() => window.location.href = "login.html", 1000);
                return;
            }

            if(submitBtn) submitBtn.classList.add("btn-loading");
            if(drawerErrorMsg) drawerErrorMsg.textContent = "";

            const cartTotalCost = cart.reduce((acc, curr) => acc + curr.subtotal, 0);
            
            const response = await fetch(`${API_BASE}/api/orders`, {
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
                showToast(`Order confirmed! Rs ${cartTotalCost} deducted.`, "success");
                
                // WOW Feature 1: Confetti Explosion!
                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#10b981', '#3b82f6', '#f59e0b']
                    });
                }

                renderOrders(); 
                // Wait briefly then refresh auth status (and wallet balance)
                setTimeout(() => window.location.reload(), 2000); // Slightly more time to see confetti
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

// Live Traffic Logic
async function fetchTraffic() {
    const trafficDot = document.getElementById("trafficDot");
    const trafficText = document.getElementById("trafficText");
    if (!trafficDot || !trafficText) return;

    try {
        const response = await fetch(`${API_BASE}/api/traffic`);
        if (response.ok) {
            const data = await response.json();
            trafficText.textContent = data.level; // e.g., Low, Moderate, High
            trafficDot.style.setProperty('--traffic-color', data.color);
        }
    } catch (e) {
        console.error("Failed to fetch traffic:", e);
        trafficText.textContent = "Unknown";
    }
}
// Start tracking traffic immediately and update every 15 seconds
fetchTraffic();
setInterval(fetchTraffic, 15000);
// Global Refresh/Sync Handler
document.addEventListener("click", (e) => {
    const syncBtn = e.target.closest("#syncIndicator");
    if (syncBtn) {
        // Spin effect is handled via .syncing class in CSS, 
        // which certain functions add/remove automatically.
        // We can force it here for immediate feedback if needed.
        
        console.log("Manual refresh requested...");
        
        // 1. Refresh Traffic
        fetchTraffic();
        
        // 2. Refresh Orders (if authenticated/on order page)
        if (typeof renderOrders === "function") renderOrders();
        
        // 3. Refresh Order History
        if (typeof renderOrderHistory === "function") renderOrderHistory();
        
        // 4. Refresh Menu if on Index
        if (typeof renderMenu === "function" && document.getElementById("menuGrid")) {
            allMenuItems = []; // Clear cache to force re-fetch
            const grid = document.getElementById("menuGrid");
            if (grid) grid.innerHTML = '<div class="loading-spinner">Refreshing menu...</div>';
            renderMenu();
        }

        showToast("Refreshing live data...", "info");
    }
});

// --- Smart Wallet QR Payment Integration ---
const walletModal = document.getElementById("walletModal");
const walletStep1 = document.getElementById("walletStep1");
const walletStep2 = document.getElementById("walletStep2");
const walletNotice = document.getElementById("walletNotice");
const qrcodeContainer = document.getElementById("qrcodeContainer");

let qrInstance = null;
let topupAmount = 0;

function openWalletModal() {
    walletModal.classList.add("active");
    walletStep1.style.display = "block";
    walletStep2.style.display = "none";
    walletNotice.style.display = "none";
    document.getElementById("topupAmount").value = "";
    document.getElementById("topupAmount").focus();
}

document.querySelectorAll(".close-wallet-btn").forEach(btn => {
    btn.addEventListener("click", () => walletModal.classList.remove("active"));
});

document.getElementById("generateQrBtn").addEventListener("click", () => {
    const amountInput = document.getElementById("topupAmount").value;
    topupAmount = parseFloat(amountInput);

    if (!topupAmount || topupAmount <= 0) {
        walletNotice.style.cssText = "display: block; background: #fee2e2; color: #ef4444;";
        walletNotice.textContent = "Please enter a valid amount.";
        return;
    }

    // Generate UPI URL
    // Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=CURRENCY
    const upiId = "coderkaushal03@okicici";
    const name = "Kaushal Sharma";
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${topupAmount}&cu=INR`;

    // Clear previous QR
    qrcodeContainer.innerHTML = "";
    
    // Create new QR
    qrInstance = new QRCode(qrcodeContainer, {
        text: upiUrl,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    document.getElementById("displayAmount").textContent = `₹${topupAmount}`;
    walletStep1.style.display = "none";
    walletStep2.style.display = "block";
    walletNotice.style.display = "none";
});

document.getElementById("verifyTopupBtn").addEventListener("click", async () => {
    const token = localStorage.getItem("smartCanteenToken");
    if(!token) return;

    walletNotice.style.cssText = "display: block; background: #f3f4f6; color: var(--text-muted);";
    walletNotice.textContent = "Simulating verification...";

    try {
        const response = await fetch(`${API_BASE}/api/wallet/topup`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ amount: topupAmount })
        });

        const data = await response.json();
        if (response.ok) {
            // Success Celebration!
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#10b981', '#3b82f6', '#f59e0b']
                });
            }

            alert(`✅ Recharge of ₹${topupAmount} Successful!`);
            walletModal.classList.remove("active");
            
            // Re-fetch our profile to get new balance and refresh the page UI
            window.location.reload(); 
        } else {
            walletNotice.style.cssText = "display: block; background: #fee2e2; color: #ef4444;";
            walletNotice.textContent = data.error || "Top-up failed.";
        }
    } catch (e) {
        walletNotice.style.cssText = "display: block; background: #fee2e2; color: #ef4444;";
        walletNotice.textContent = "Server error. Could not verify.";
    }
});

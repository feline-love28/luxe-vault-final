/**
 * Luxe Vault - Main Application Core & Global Utilities
 * Brand: Luxe Vault ("Rent Luxury. Define Elegance.")
 */

// 1. FRONTEND APP STATE STRUCTURE
const appState = {
    user: null,
    isAuthenticated: false,
    role: null, // "customer" | "admin" | null
    selectedClothing: null
};

// 2. HELPER UTILITIES
function formatCurrency(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <span>${icon} ${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:inherit;">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 4000);
}

// 3. REUSABLE CLOTHING CARD COMPONENT (SECTION 9 REQUIREMENT)
function createClothingCardHTML(item) {
    const isAvailable = item.availability === "Available";
    const badgeClass = isAvailable ? "badge-available" : "badge-rented";
    
    return `
        <div class="clothing-card" data-id="${item.id}">
            <div class="card-image-wrap">
                <img src="${item.image}" alt="${item.name}" loading="lazy">
                <span class="badge ${badgeClass} card-badge">${item.availability}</span>
                <span class="card-category-tag">${item.category} • Size ${item.size}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${item.name}</h3>
                <div class="card-meta">
                    <span class="card-rating">★ ${item.rating}</span>
                    <span>(${item.reviewsCount} reviews)</span>
                    <span>• ${item.gender}</span>
                </div>
                <div class="card-price-row">
                    <div class="price-box">
                        <span class="price-label">Rental Price</span>
                        <span class="price-val">${formatCurrency(item.rentalPrice)} <span>/ day</span></span>
                    </div>
                    <div style="text-align:right;">
                        <span class="price-label">Deposit</span>
                        <div style="font-size:0.85rem; font-weight:700; color:var(--text-muted);">${formatCurrency(item.securityDeposit)}</div>
                    </div>
                </div>
                <div class="card-actions">
                    <a href="product-details.html?id=${item.id}" class="btn btn-outline btn-sm btn-full">View Details</a>
                    ${isAvailable 
                        ? `<a href="rental.html?id=${item.id}" class="btn btn-accent btn-sm btn-full">Rent Now</a>`
                        : `<button class="btn btn-outline btn-sm btn-full" disabled style="opacity:0.5;cursor:not-allowed;">Rented</button>`
                    }
                </div>
            </div>
        </div>
    `;
}

// 4. HEADER & NAVIGATION STATE RENDERER
// The links are fixed in the HTML (same on every page). Only the right-hand
// buttons depend on the logged-in user, plus the "active" link highlight.
function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function navActionsHTML(user) {
    if (!user) {
        return `
            <a href="login.html" class="btn btn-outline btn-sm">Login</a>
            <a href="register.html" class="btn btn-primary btn-sm">Register</a>
        `;
    }
    if (user.role === 'admin') {
        return `
            <a href="admin/admin-dashboard.html" class="btn btn-accent btn-sm">Admin Portal</a>
            <button onclick="handleGlobalLogout()" class="btn btn-outline btn-sm">Logout</button>
        `;
    }
    return `
        <a href="profile.html" class="btn btn-primary btn-sm">Hi, ${escapeHTML(user.name.split(' ')[0])}</a>
        <button onclick="handleGlobalLogout()" class="btn btn-outline btn-sm">Logout</button>
    `;
}

function renderNavActions(user) {
    const navActions = document.getElementById('nav-actions');
    if (!navActions) return;

    const html = navActionsHTML(user);
    // Only touch the DOM if something actually changed, so nothing flickers
    if (navActions.dataset.rendered !== html) {
        navActions.innerHTML = html;
        navActions.dataset.rendered = html;
    }
}

function highlightActiveNavLink() {
    const navMenu = document.getElementById('nav-menu');
    if (!navMenu) return;
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === currentPath);
    });
}

function getCachedUser() {
    try {
        return JSON.parse(localStorage.getItem('luxevault_current_user')) || null;
    } catch (err) {
        return null;
    }
}

async function updateNavigationHeader() {
    // 1. Draw immediately from the saved login (no waiting for the server)
    const cachedUser = localStorage.getItem('luxevault_token') ? getCachedUser() : null;
    renderNavActions(cachedUser);
    highlightActiveNavLink();

    // 2. Confirm with the server; only redraws if the answer differs
    try {
        const user = await apiService.auth.getCurrentUser();
        appState.user = user;
        appState.isAuthenticated = !!user;
        appState.role = user ? user.role : null;
        renderNavActions(user);
    } catch (err) {
        console.error("Navigation render error:", err);
    }
}

async function handleGlobalLogout() {
    await apiService.auth.logout();
    showToast("Logged out successfully", "success");
    setTimeout(() => {
        window.location.href = "index.html";
    }, 500);
}

// Mobile Navbar Toggle Setup
function setupMobileNav() {
    const toggleBtn = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');
    if (toggleBtn && navMenu) {
        toggleBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
}

// Script is loaded at the end of <body>, so the header already exists: render now
updateNavigationHeader();
setupMobileNav();

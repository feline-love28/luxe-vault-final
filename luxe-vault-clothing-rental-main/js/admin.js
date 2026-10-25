/**
 * Luxe Vault - Admin Dashboard & Management Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Admin pages are for admins only: everyone else goes to the admin login
    const currentUser = await apiService.auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = "admin-login.html";
        return;
    }

    // Check if on Admin page
    const adminDashboardPage = document.getElementById('admin-dashboard-view');
    if (adminDashboardPage) {
        initAdminDashboard();
    }

    const adminClothesPage = document.getElementById('admin-clothes-view');
    if (adminClothesPage) {
        initAdminClothesInventory();
    }

    const adminCustomersPage = document.getElementById('admin-customers-view');
    if (adminCustomersPage) {
        initAdminCustomersList();
    }

    const adminRentalsPage = document.getElementById('admin-rentals-view');
    if (adminRentalsPage) {
        initAdminRentalsList();
    }

    const adminPaymentsPage = document.getElementById('admin-payments-view');
    if (adminPaymentsPage) {
        initAdminPaymentsList();
    }
});

// -------------------------------------------------------------
// 1. ADMIN DASHBOARD STATS
// -------------------------------------------------------------
async function initAdminDashboard() {
    try {
        const stats = await apiService.admin.getDashboardStats();

        if (document.getElementById('stat-total-customers')) document.getElementById('stat-total-customers').textContent = stats.totalCustomers;
        if (document.getElementById('stat-total-clothes')) document.getElementById('stat-total-clothes').textContent = stats.totalClothes;
        if (document.getElementById('stat-avail-clothes')) document.getElementById('stat-avail-clothes').textContent = stats.availableClothes;
        if (document.getElementById('stat-active-rentals')) document.getElementById('stat-active-rentals').textContent = stats.activeRentals;
        if (document.getElementById('stat-completed-rentals')) document.getElementById('stat-completed-rentals').textContent = stats.completedRentals;
        if (document.getElementById('stat-total-revenue')) document.getElementById('stat-total-revenue').textContent = formatCurrency(stats.totalRevenue);

        // Load recent rentals table
        const recentRentals = await apiService.rentals.getUserRentals();
        const tbody = document.getElementById('admin-recent-rentals-tbody');
        if (tbody) {
            tbody.innerHTML = recentRentals.slice(0, 5).map(r => `
                <tr>
                    <td><strong>${r.id}</strong></td>
                    <td>${r.customerName}</td>
                    <td>${r.clothingName}</td>
                    <td>${r.startDate} to ${r.returnDate}</td>
                    <td><strong>${formatCurrency(r.totalAmount)}</strong></td>
                    <td><span class="status-badge status-${(r.rentalStatus || 'confirmed').toLowerCase()}">${r.rentalStatus}</span></td>
                </tr>
            `).join('');
        }

    } catch (err) {
        console.error("Failed to load admin stats:", err);
    }
}

// -------------------------------------------------------------
// 2. ADMIN CLOTHES INVENTORY (CRUD)
// -------------------------------------------------------------
async function initAdminClothesInventory() {
    await renderClothesInventoryTable();

    // Add Clothing Modal Setup
    const addBtn = document.getElementById('btn-open-add-modal');
    const modal = document.getElementById('add-clothing-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const addForm = document.getElementById('add-clothing-form');

    if (addBtn && modal) {
        addBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('new-name').value.trim();
            const category = document.getElementById('new-category').value;
            const size = document.getElementById('new-size').value;
            const gender = document.getElementById('new-gender').value;
            const color = document.getElementById('new-color').value.trim();
            const rentalPrice = Number(document.getElementById('new-price').value);
            const securityDeposit = Number(document.getElementById('new-deposit').value);
            const image = document.getElementById('new-image').value.trim();
            const description = document.getElementById('new-description').value.trim();

            try {
                await apiService.admin.addClothing({
                    name, category, size, gender, color, rentalPrice, securityDeposit,
                    availability: "Available", image, description
                });

                showToast("New clothing item added!", "success");
                modal.style.display = 'none';
                addForm.reset();
                renderClothesInventoryTable();

            } catch (err) {
                showToast("Failed to add clothing item", "error");
            }
        });
    }
}

async function renderClothesInventoryTable() {
    const tbody = document.getElementById('clothes-table-tbody');
    if (!tbody) return;

    try {
        const clothes = await apiService.clothes.getAll();
        tbody.innerHTML = clothes.map(c => `
            <tr>
                <td><strong>#${c.id}</strong></td>
                <td>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <img src="${c.image}" alt="${c.name}" class="table-img-thumb">
                        <div>
                            <strong>${c.name}</strong>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${c.color} • ${c.gender}</div>
                        </div>
                    </div>
                </td>
                <td>${c.category}</td>
                <td><span style="font-weight:700;">${c.size}</span></td>
                <td><strong>${formatCurrency(c.rentalPrice)}</strong> / day</td>
                <td>${formatCurrency(c.securityDeposit)}</td>
                <td><span class="badge ${c.availability === 'Available' ? 'badge-available' : 'badge-rented'}">${c.availability}</span></td>
                <td>
                    <div style="display:flex; gap:0.35rem;">
                        <button onclick="handleDeleteClothing(${c.id})" class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger-bg);">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("Failed to render clothes table:", err);
    }
}

async function handleDeleteClothing(id) {
    if (confirm("Are you sure you want to delete this clothing item from inventory?")) {
        try {
            await apiService.admin.deleteClothing(id);
            showToast("Item deleted successfully", "success");
            renderClothesInventoryTable();
        } catch (err) {
            showToast("Failed to delete item", "error");
        }
    }
}

// -------------------------------------------------------------
// 3. ADMIN CUSTOMERS LIST
// -------------------------------------------------------------
async function initAdminCustomersList() {
    const tbody = document.getElementById('customers-table-tbody');
    if (!tbody) return;

    try {
        const customers = await apiService.admin.getCustomers();
        if (customers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No registered customers yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = customers.map(c => `
            <tr>
                <td><strong>${c.id}</strong></td>
                <td>
                    <strong>${c.name}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${c.address || 'No address'}</div>
                </td>
                <td>${c.email}</td>
                <td>${c.phone}</td>
                <td>${String(c.joinedDate || '').slice(0, 10)}</td>
                <td><span class="badge badge-available">${c.status || 'Active'}</span></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Failed to load customers:", err);
    }
}

// -------------------------------------------------------------
// 4. ADMIN RENTALS LIST & STATUS UPDATE
// -------------------------------------------------------------
async function initAdminRentalsList() {
    renderAdminRentalsTable();
}

async function renderAdminRentalsTable() {
    const tbody = document.getElementById('rentals-table-tbody');
    if (!tbody) return;

    try {
        const rentals = await apiService.rentals.getUserRentals();
        tbody.innerHTML = rentals.map(r => `
            <tr>
                <td><strong>${r.id}</strong></td>
                <td>${r.customerName}<br><span style="font-size:0.75rem; color:var(--text-muted);">${r.customerEmail}</span></td>
                <td>${r.clothingName}</td>
                <td>${r.startDate} to ${r.returnDate} (${r.rentalDays}d)</td>
                <td><strong>${formatCurrency(r.totalAmount)}</strong></td>
                <td>
                    <select onchange="handleAdminRentalStatusChange('${r.id}', this.value)" class="sort-select" style="padding:0.25rem 0.5rem; font-size:0.8rem;">
                        <option value="Confirmed" ${r.rentalStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Active" ${r.rentalStatus === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Returned" ${r.rentalStatus === 'Returned' ? 'selected' : ''}>Returned</option>
                        <option value="Cancelled" ${r.rentalStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Failed to render rentals table:", err);
    }
}

async function handleAdminRentalStatusChange(rentalId, newStatus) {
    try {
        await apiService.admin.updateRentalStatus(rentalId, newStatus);
        showToast(`Rental ${rentalId} status updated to ${newStatus}`, "success");
        renderAdminRentalsTable();
    } catch (err) {
        showToast("Failed to update rental status", "error");
    }
}

// -------------------------------------------------------------
// 5. ADMIN PAYMENTS TRANSACTIONS
// -------------------------------------------------------------
async function initAdminPaymentsList() {
    const tbody = document.getElementById('payments-table-tbody');
    if (!tbody) return;

    try {
        const payments = await apiService.admin.getPayments();
        tbody.innerHTML = payments.map(p => `
            <tr>
                <td><strong>${p.id}</strong></td>
                <td>${p.rentalId}</td>
                <td>${p.customerName}</td>
                <td><strong>${formatCurrency(p.amount)}</strong></td>
                <td><span style="font-size:0.85rem; font-weight:600;">${p.paymentMethod}</span></td>
                <td><code style="font-size:0.75rem; background:#f1f5f9; padding:0.2rem 0.4rem; border-radius:4px;">${p.transactionId}</code></td>
                <td><span class="badge badge-available">${p.paymentStatus}</span></td>
                <td>${p.date}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Failed to load payments:", err);
    }
}

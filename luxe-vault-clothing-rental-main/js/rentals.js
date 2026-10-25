/**
 * Luxe Vault - Rental Calculation, Booking Form & My-Rentals Module
 */

let currentRentalItem = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. RENTAL BOOKING FORM INITIALIZATION
    const rentalForm = document.getElementById('rental-form');
    if (rentalForm) {
        initRentalForm();
    }

    // 2. MY RENTALS LIST INITIALIZATION
    const myRentalsList = document.getElementById('my-rentals-list');
    if (myRentalsList) {
        initMyRentalsPage();
    }
});

// -------------------------------------------------------------
// 1. RENTAL FORM & LIVE PRICE CALCULATOR
// -------------------------------------------------------------
async function initRentalForm() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        showToast("No outfit selected for rental.", "error");
        setTimeout(() => window.location.href = "products.html", 1000);
        return;
    }

    try {
        // Booking requires an account: send visitors to login, then back here
        const user = await apiService.auth.getCurrentUser();
        if (!user) {
            showToast("Please log in or register to rent an outfit.", "error");
            const backTo = encodeURIComponent(`rental.html?id=${productId}`);
            setTimeout(() => window.location.href = `login.html?redirect=${backTo}`, 1000);
            return;
        }

        currentRentalItem = await apiService.clothes.getById(productId);

        // Pre-fill customer details from the account
        if (document.getElementById('cust-name')) document.getElementById('cust-name').value = user.name || "";
        if (document.getElementById('cust-email')) document.getElementById('cust-email').value = user.email || "";
        if (document.getElementById('cust-phone')) document.getElementById('cust-phone').value = user.phone || "";
        if (document.getElementById('cust-address')) document.getElementById('cust-address').value = user.address || "";

        // Render Summary Sidebar Product Box
        renderRentalSummarySidebar(currentRentalItem, 1);

        // Date Inputs Setup & Minimum Constraints
        const startDateInput = document.getElementById('startDate');
        const returnDateInput = document.getElementById('returnDate');

        const today = new Date().toISOString().split('T')[0];
        startDateInput.min = today;
        
        // Set default dates (Today and Today + 3 days)
        const defaultStart = new Date();
        const defaultReturn = new Date();
        defaultReturn.setDate(defaultStart.getDate() + 3);

        startDateInput.value = defaultStart.toISOString().split('T')[0];
        returnDateInput.value = defaultReturn.toISOString().split('T')[0];
        returnDateInput.min = startDateInput.value;

        // Perform Initial Calculation
        calculateRentalTotals();

        // Listen for Date Changes
        startDateInput.addEventListener('change', () => {
            returnDateInput.min = startDateInput.value;
            if (returnDateInput.value < startDateInput.value) {
                returnDateInput.value = startDateInput.value;
            }
            calculateRentalTotals();
        });

        returnDateInput.addEventListener('change', () => {
            calculateRentalTotals();
        });

        // Handle Form Submission -> Proceeds to Payment
        const rentalForm = document.getElementById('rental-form');
        rentalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleRentalFormSubmit();
        });

    } catch (err) {
        console.error("Error setting up rental form:", err);
        showToast("Failed to load rental details.", "error");
    }
}

function calculateRentalTotals() {
    const startDateVal = document.getElementById('startDate').value;
    const returnDateVal = document.getElementById('returnDate').value;
    const calcNotice = document.getElementById('calc-notice');

    if (!startDateVal || !returnDateVal || !currentRentalItem) return;

    const start = new Date(startDateVal);
    const end = new Date(returnDateVal);

    if (end < start) {
        if (calcNotice) {
            calcNotice.textContent = "Return date must be on or after the start date.";
            calcNotice.style.color = "var(--danger)";
        }
        return;
    }

    // Calculate duration in days (minimum 1 day)
    const diffTime = Math.abs(end - start);
    const rentalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const dailyRate = currentRentalItem.rentalPrice;
    const rentalCost = dailyRate * rentalDays;
    const securityDeposit = currentRentalItem.securityDeposit;
    const totalAmount = rentalCost + securityDeposit;

    // Update Display Elements
    if (document.getElementById('sum-days')) document.getElementById('sum-days').textContent = `${rentalDays} Day${rentalDays > 1 ? 's' : ''}`;
    if (document.getElementById('sum-daily-rate')) document.getElementById('sum-daily-rate').textContent = formatCurrency(dailyRate);
    if (document.getElementById('sum-rental-cost')) document.getElementById('sum-rental-cost').textContent = formatCurrency(rentalCost);
    if (document.getElementById('sum-deposit')) document.getElementById('sum-deposit').textContent = formatCurrency(securityDeposit);
    if (document.getElementById('sum-total')) document.getElementById('sum-total').textContent = formatCurrency(totalAmount);

    if (calcNotice) {
        calcNotice.textContent = `Estimated calculation for ${rentalDays} day(s) rental. Final amount verified at checkout.`;
        calcNotice.style.color = "#b45309";
    }

    // Attach calculated object for form payload
    window.activeRentalDraft = {
        clothingId: currentRentalItem.id,
        clothingName: currentRentalItem.name,
        clothingImage: currentRentalItem.image,
        dailyRate: dailyRate,
        rentalDays: rentalDays,
        rentalCost: rentalCost,
        securityDeposit: securityDeposit,
        totalAmount: totalAmount,
        startDate: startDateVal,
        returnDate: returnDateVal
    };
}

function renderRentalSummarySidebar(item, initialDays) {
    const summaryBox = document.getElementById('rental-summary-product');
    if (!summaryBox) return;

    summaryBox.innerHTML = `
        <div class="summary-product-mini">
            <img src="${item.image}" alt="${item.name}">
            <div class="mini-details">
                <h4>${item.name}</h4>
                <p>${item.category} • Size ${item.size}</p>
                <p style="font-weight:700; color:var(--primary-900); margin-top:0.35rem;">
                    ${formatCurrency(item.rentalPrice)} / day
                </p>
            </div>
        </div>
    `;
}

function handleRentalFormSubmit() {
    const name = document.getElementById('cust-name').value.trim();
    const email = document.getElementById('cust-email').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const terms = document.getElementById('termsCheck')?.checked;

    if (!name || !email || !phone || !address) {
        showToast("Please fill in all customer delivery fields.", "error");
        return;
    }

    if (!terms) {
        showToast("Please accept the rental terms and conditions.", "error");
        return;
    }

    // Combine with rental draft
    const fullBookingPayload = {
        ...window.activeRentalDraft,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        customerAddress: address
    };

    // Save temporary checkout session to localStorage
    sessionStorage.setItem("luxevault_checkout_session", JSON.stringify(fullBookingPayload));

    // Redirect to Payment page
    window.location.href = "payment.html";
}

// -------------------------------------------------------------
// 2. MY RENTALS PAGE
// -------------------------------------------------------------
async function initMyRentalsPage() {
    const container = document.getElementById('my-rentals-list');
    if (!container) return;

    try {
        const currentUser = await apiService.auth.getCurrentUser();

        // Logged-out visitors get a prompt instead of anyone's rentals
        if (!currentUser) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔒</div>
                    <h3>Please Log In to See Your Rentals</h3>
                    <p style="color:var(--text-muted); margin-bottom:1.5rem;">Log in or create an account to view and track your rentals.</p>
                    <div style="display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap;">
                        <a href="login.html?redirect=my-rentals.html" class="btn btn-primary">Login</a>
                        <a href="register.html" class="btn btn-outline">Register</a>
                    </div>
                </div>
            `;
            return;
        }

        const rentals = await apiService.rentals.getUserRentals(currentUser.email);

        if (rentals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛍️</div>
                    <h3>No Rentals Found</h3>
                    <p style="color:var(--text-muted); margin-bottom:1.5rem;">You haven't placed any clothing rental requests yet.</p>
                    <a href="products.html" class="btn btn-primary">Browse Clothes Catalog</a>
                </div>
            `;
            return;
        }

        container.innerHTML = rentals.map(r => `
            <div class="rental-item-card">
                <img src="${r.clothingImage}" alt="${r.clothingName}" class="rental-item-img">
                <div class="rental-item-info">
                    <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.25rem;">
                        <span style="font-size:0.8rem; font-weight:800; color:var(--accent-gold);">${r.id}</span>
                        <span style="font-size:0.75rem; color:var(--text-muted);">Booked on ${r.createdAt}</span>
                    </div>
                    <h4>${r.clothingName}</h4>
                    <div class="rental-meta-grid">
                        <div>
                            <span style="color:var(--text-muted); display:block;">Start Date</span>
                            <strong>${r.startDate}</strong>
                        </div>
                        <div>
                            <span style="color:var(--text-muted); display:block;">Return Date</span>
                            <strong>${r.returnDate}</strong>
                        </div>
                        <div>
                            <span style="color:var(--text-muted); display:block;">Duration</span>
                            <strong>${r.rentalDays} Days</strong>
                        </div>
                    </div>
                </div>
                <div class="rental-actions-column">
                    <span class="status-badge status-${(r.rentalStatus || 'confirmed').toLowerCase()}">${r.rentalStatus}</span>
                    <div style="font-size:1.3rem; font-weight:800; color:var(--primary-900);">
                        ${formatCurrency(r.totalAmount)}
                    </div>
                    <span style="font-size:0.75rem; color:var(--success); font-weight:600;">Payment: ${r.paymentStatus}</span>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error("Failed to load user rentals:", err);
        container.innerHTML = `
            <div class="empty-state">
                <h3>Error Loading Rentals</h3>
                <p>${err.message}</p>
            </div>
        `;
    }
}

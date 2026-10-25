/**
 * Luxe Vault - Payment & Checkout Processing Simulation
 * 
 * IMPORTANT: Front-end demo simulation only.
 * No real payment credentials or financial transactions are collected or stored.
 */

let activePaymentSession = null;

document.addEventListener('DOMContentLoaded', () => {
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        initPaymentPage();
    }
});

async function initPaymentPage() {
    const user = await apiService.auth.getCurrentUser();
    if (!user) {
        showToast("Please log in to continue to payment.", "error");
        setTimeout(() => window.location.href = "login.html?redirect=my-rentals.html", 1000);
        return;
    }

    const sessionDataStr = sessionStorage.getItem("luxevault_checkout_session");
    
    if (!sessionDataStr) {
        showToast("No active checkout session found.", "error");
        setTimeout(() => window.location.href = "products.html", 1000);
        return;
    }

    activePaymentSession = JSON.parse(sessionDataStr);
    renderPaymentSummary(activePaymentSession);

    // Setup Payment Method Card Selectors
    const methodCards = document.querySelectorAll('.payment-method-card');
    const creditCardFields = document.getElementById('credit-card-fields');
    const upiFields = document.getElementById('upi-fields');

    methodCards.forEach(card => {
        card.addEventListener('click', () => {
            methodCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;

            const selectedMethod = radio.value;
            if (selectedMethod === 'card') {
                if (creditCardFields) creditCardFields.style.display = 'block';
                if (upiFields) upiFields.style.display = 'none';
            } else if (selectedMethod === 'upi') {
                if (creditCardFields) creditCardFields.style.display = 'none';
                if (upiFields) upiFields.style.display = 'block';
            } else {
                if (creditCardFields) creditCardFields.style.display = 'none';
                if (upiFields) upiFields.style.display = 'none';
            }
        });
    });

    // Form submission simulation
    const paymentForm = document.getElementById('payment-form');
    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        processCheckoutPayment();
    });
}

function renderPaymentSummary(data) {
    // Product Overview
    const prodImg = document.getElementById('pay-prod-img');
    const prodTitle = document.getElementById('pay-prod-title');
    const prodDates = document.getElementById('pay-prod-dates');

    if (prodImg) prodImg.src = data.clothingImage;
    if (prodTitle) prodTitle.textContent = data.clothingName;
    if (prodDates) prodDates.textContent = `${data.startDate} to ${data.returnDate} (${data.rentalDays} Days)`;

    // Financial Breakdown
    if (document.getElementById('pay-rate')) document.getElementById('pay-rate').textContent = `${formatCurrency(data.dailyRate)} x ${data.rentalDays} days`;
    if (document.getElementById('pay-rental-cost')) document.getElementById('pay-rental-cost').textContent = formatCurrency(data.rentalCost);
    if (document.getElementById('pay-deposit')) document.getElementById('pay-deposit').textContent = formatCurrency(data.securityDeposit);
    if (document.getElementById('pay-total-amount')) document.getElementById('pay-total-amount').textContent = formatCurrency(data.totalAmount);
    
    // Customer Info
    if (document.getElementById('pay-cust-name')) document.getElementById('pay-cust-name').textContent = data.customerName;
    if (document.getElementById('pay-cust-email')) document.getElementById('pay-cust-email').textContent = data.customerEmail;
}

async function processCheckoutPayment() {
    const submitBtn = document.getElementById('pay-submit-btn');
    const selectedMethod = document.querySelector('input[name="payment-method"]:checked')?.value || "card";

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Processing Payment Securely...";
        }

        // 1. Create Rental record via API Layer
        const rentalResult = await apiService.rentals.create(activePaymentSession);

        // 2. Create Payment Transaction record via API Layer
        await apiService.payments.processPayment({
            rentalId: rentalResult.rental.id,
            customerName: activePaymentSession.customerName,
            amount: activePaymentSession.totalAmount,
            paymentMethod: selectedMethod.toUpperCase()
        });

        // 3. Clear temporary checkout session
        sessionStorage.removeItem("luxevault_checkout_session");

        showToast("Payment Successful! Booking Confirmed.", "success");

        // 4. Redirect to My Rentals page
        setTimeout(() => {
            window.location.href = "my-rentals.html";
        }, 1200);

    } catch (err) {
        console.error("Payment processing error:", err);
        showToast("Payment processing failed. Please try again.", "error");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Proceed & Pay Now";
        }
    }
}

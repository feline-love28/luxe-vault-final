/**
 * Luxe Vault - Authentication & Profile JavaScript Module
 * Brand: Luxe Vault ("Rent Luxury. Define Elegance.")
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. CUSTOMER LOGIN FORM HANDLER
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const alertBox = document.getElementById('auth-alert');
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            if (!email || !password) {
                showAuthAlert(alertBox, "Please fill in both email and password.", "danger");
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = "Authenticating...";
                hideAuthAlert(alertBox);

                const result = await apiService.auth.login(email, password);
                
                showAuthAlert(alertBox, "Login successful! Redirecting...", "success");
                showToast("Welcome back to Luxe Vault, " + result.user.name + "!", "success");

                setTimeout(() => {
                    if (result.user.role === 'admin') {
                        window.location.href = "admin/admin-dashboard.html";
                    } else {
                        const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || "products.html";
                        window.location.href = redirectUrl;
                    }
                }, 800);

            } catch (err) {
                showAuthAlert(alertBox, err.message || "Invalid credentials.", "danger");
                submitBtn.disabled = false;
                submitBtn.textContent = "Sign In";
            }
        });
    }

    // 2. CUSTOMER REGISTER FORM HANDLER
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const address = document.getElementById('address').value.trim();
            const termsChecked = document.getElementById('termsCheckbox')?.checked;
            const alertBox = document.getElementById('auth-alert');
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            if (!fullName || !email || !phone || !password || !confirmPassword || !address) {
                showAuthAlert(alertBox, "Please complete all required fields.", "danger");
                return;
            }

            if (!isValidEmail(email)) {
                showAuthAlert(alertBox, "Please enter a valid email address.", "danger");
                return;
            }

            if (password.length < 6) {
                showAuthAlert(alertBox, "Password must contain at least 6 characters.", "danger");
                return;
            }

            if (password !== confirmPassword) {
                showAuthAlert(alertBox, "Passwords do not match.", "danger");
                return;
            }

            if (!termsChecked) {
                showAuthAlert(alertBox, "You must agree to the Terms & Conditions.", "danger");
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = "Creating Account...";
                hideAuthAlert(alertBox);

                const result = await apiService.auth.register({ fullName, email, phone, password, address });

                showAuthAlert(alertBox, result.message, "success");
                showToast("Account created successfully!", "success");

                setTimeout(() => {
                    window.location.href = "products.html";
                }, 1000);

            } catch (err) {
                showAuthAlert(alertBox, err.message, "danger");
                submitBtn.disabled = false;
                submitBtn.textContent = "Create Account";
            }
        });
    }

    // 3. ADMIN LOGIN FORM HANDLER
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value.trim();
            const password = document.getElementById('adminPassword').value.trim();
            const alertBox = document.getElementById('admin-alert');
            const submitBtn = adminLoginForm.querySelector('button[type="submit"]');

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = "Verifying Admin Credentials...";
                hideAuthAlert(alertBox);

                const result = await apiService.auth.login(email, password);

                if (result.user.role !== 'admin') {
                    throw new Error("Access Denied. You do not have administrator privileges.");
                }

                showAuthAlert(alertBox, "Admin authenticated. Loading portal...", "success");
                showToast("Welcome to Luxe Vault Admin Portal", "success");

                setTimeout(() => {
                    window.location.href = "admin-dashboard.html";
                }, 800);

            } catch (err) {
                showAuthAlert(alertBox, err.message, "danger");
                submitBtn.disabled = false;
                submitBtn.textContent = "Access Admin Dashboard";
            }
        });
    }

    // 4. PROFILE PAGE INITIALIZATION & EDIT
    const profileContainer = document.getElementById('profile-page-content');
    if (profileContainer) {
        loadUserProfileData();
    }
});

async function loadUserProfileData() {
    try {
        const user = await apiService.auth.getCurrentUser();
        if (!user) {
            window.location.href = "login.html?redirect=profile.html";
            return;
        }

        document.getElementById('prof-avatar-letter').textContent = user.name.charAt(0).toUpperCase();
        document.getElementById('prof-display-name').textContent = user.name;
        document.getElementById('prof-display-email').textContent = user.email;

        document.getElementById('prof-fullName').value = user.name || "";
        document.getElementById('prof-email').value = user.email || "";
        document.getElementById('prof-phone').value = user.phone || "";
        document.getElementById('prof-address').value = user.address || "";

        const form = document.getElementById('profile-edit-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('prof-fullName').value.trim();
                const phone = document.getElementById('prof-phone').value.trim();
                const address = document.getElementById('prof-address').value.trim();

                try {
                    await apiService.auth.updateProfile({ name, phone, address });
                    showToast("Profile details updated successfully!", "success");
                    document.getElementById('prof-display-name').textContent = name;
                } catch (err) {
                    showToast("Failed to update profile", "error");
                }
            });
        }

    } catch (err) {
        console.error("Profile load error:", err);
    }
}

function showAuthAlert(el, message, type) {
    if (!el) return;
    el.className = `alert alert-${type}`;
    el.textContent = message;
    el.style.display = 'block';
}

function hideAuthAlert(el) {
    if (!el) return;
    el.style.display = 'none';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

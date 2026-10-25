/**
 * Luxe Vault - API Service Layer
 * Brand: Luxe Vault ("Rent Luxury. Define Elegance.")
 *
 * Every method here calls the Express + MySQL backend (backend/server.js).
 * The pages only use apiService, so they don't know about fetch or the database.
 */

const API_BASE = "http://localhost:5000/api";

// Small fetch wrapper: adds JSON headers + token, throws Error(message) on failure
async function request(path, { method = "GET", body } = {}) {
    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem("luxevault_token");
    if (token) headers["Authorization"] = "Bearer " + token;

    let res;
    try {
        res = await fetch(API_BASE + path, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
    } catch (err) {
        throw new Error("Cannot reach the server. Make sure the backend is running.");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed.");
    return data;
}

const apiService = {
    // -------------------------------------------------------------
    // AUTHENTICATION APIs
    // -------------------------------------------------------------
    auth: {
        async login(email, password) {
            const data = await request("/auth/login", { method: "POST", body: { email, password } });
            localStorage.setItem("luxevault_token", data.token);
            localStorage.setItem("luxevault_current_user", JSON.stringify(data.user));
            return data;
        },

        async register(userData) {
            const data = await request("/auth/register", { method: "POST", body: userData });
            localStorage.setItem("luxevault_token", data.token);
            localStorage.setItem("luxevault_current_user", JSON.stringify(data.user));
            return data;
        },

        async getCurrentUser() {
            if (!localStorage.getItem("luxevault_token")) return null;
            try {
                const data = await request("/auth/me");
                localStorage.setItem("luxevault_current_user", JSON.stringify(data.user));
                return data.user;
            } catch (err) {
                localStorage.removeItem("luxevault_token");
                localStorage.removeItem("luxevault_current_user");
                return null;
            }
        },

        async logout() {
            localStorage.removeItem("luxevault_token");
            localStorage.removeItem("luxevault_current_user");
            return { success: true };
        },

        async updateProfile(profileData) {
            const data = await request("/auth/me", { method: "PUT", body: profileData });
            localStorage.setItem("luxevault_current_user", JSON.stringify(data.user));
            return data;
        }
    },

    // -------------------------------------------------------------
    // CONTACT API
    // -------------------------------------------------------------
    contact: {
        async send(formData) {
            return request("/contact", { method: "POST", body: formData });
        }
    },

    // -------------------------------------------------------------
    // CLOTHES CATALOG APIs
    // -------------------------------------------------------------
    clothes: {
        async getAll(filters = {}) {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "") params.append(key, value);
            });
            const query = params.toString();
            const data = await request("/clothes" + (query ? "?" + query : ""));
            return data.clothes;
        },

        async getById(id) {
            const data = await request("/clothes/" + encodeURIComponent(id));
            return data.clothing;
        }
    },

    // -------------------------------------------------------------
    // RENTALS APIs
    // -------------------------------------------------------------
    rentals: {
        // The server works out the price itself; only outfit, dates and contact details matter
        async create(rentalData) {
            return request("/rentals", { method: "POST", body: rentalData });
        },

        // With an email: the logged-in customer's own rentals.
        // Without one: every rental (admin screens only; the server rejects non-admins).
        async getUserRentals(userEmail) {
            const data = await request(userEmail ? "/rentals/mine" : "/admin/rentals");
            return data.rentals;
        },

        async getById(id) {
            const data = await request("/rentals/" + encodeURIComponent(id));
            return data.rental;
        }
    },

    // -------------------------------------------------------------
    // PAYMENTS APIs (simulated payment, saved in MySQL)
    // -------------------------------------------------------------
    payments: {
        async processPayment(paymentDetails) {
            return request("/payments", {
                method: "POST",
                body: { rentalId: paymentDetails.rentalId, paymentMethod: paymentDetails.paymentMethod }
            });
        }
    },

    // -------------------------------------------------------------
    // ADMIN APIs (admin account required)
    // -------------------------------------------------------------
    admin: {
        async getDashboardStats() {
            const data = await request("/admin/stats");
            return data.stats;
        },

        async getCustomers() {
            const data = await request("/admin/customers");
            return data.customers;
        },

        async getPayments() {
            const data = await request("/admin/payments");
            return data.payments;
        },

        async addClothing(itemData) {
            const data = await request("/admin/clothes", { method: "POST", body: itemData });
            return data.clothing;
        },

        async updateClothing(id, itemData) {
            const data = await request("/admin/clothes/" + id, { method: "PUT", body: itemData });
            return data.clothing;
        },

        async deleteClothing(id) {
            return request("/admin/clothes/" + id, { method: "DELETE" });
        },

        async updateRentalStatus(rentalId, status) {
            return request("/admin/rentals/" + encodeURIComponent(rentalId) + "/status", {
                method: "PATCH",
                body: { status }
            });
        }
    }
};

if (typeof window !== "undefined") {
    window.apiService = apiService;
} else if (typeof globalThis !== "undefined") {
    globalThis.apiService = apiService;
}

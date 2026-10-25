# Luxe Vault - Clothing Rental

HTML/CSS/JS frontend + Node.js, Express and MySQL backend.
Customers browse designer outfits, book them for a date range and pay (simulated); admins manage outfits, rentals and payments.

## Setup
1. Install Node.js and MySQL (keep the MySQL service running).
2. In `backend/`, copy `.env.example` to `.env` and fill in your MySQL user, password and a long random `JWT_SECRET`.
3. In `backend/`:
   ```
   npm install
   npm run setup     # creates the database + tables, the admin user and the 15 starter outfits
   npm run dev       # starts the server
   ```
4. Open http://localhost:5000 (the server also serves the frontend).

Admin login: `admin@luxevault.com` / `admin123` (created by `npm run setup`).

## Database (MySQL, `backend/schema.sql`)
| Table | Purpose |
|---|---|
| `users` | customers and the admin (password stored as a bcrypt hash) |
| `clothes` | the outfit catalog |
| `rentals` | a booking: user, outfit, dates, price, status |
| `payments` | one payment per rental |
| `messages` | Contact Us form submissions |

Relations: a rental belongs to a user and an outfit; a payment belongs to a rental and a user.

## How it works
- **Auth:** register/login return a JWT; protected routes read it from the `Authorization: Bearer` header. Admin routes also check the admin role.
- **Booking:** the server calculates days and price from the outfit's saved rate (the browser's numbers are ignored), rejects past dates, and locks the outfit row so it can't be double booked. The outfit is marked Rented.
- **Payment:** simulated (no card details are accepted or stored). The amount comes from the saved rental. Paying marks the rental Paid.
- **Admin:** marking a rental Returned or Cancelled makes the outfit Available again. An outfit with rental history can't be deleted.

## Endpoints
| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | public |
| GET / PUT | `/api/auth/me` | logged in |
| GET | `/api/clothes` (filters: search, category, size, gender, color, availability, maxPrice, sortBy), `/api/clothes/:id` | public |
| POST | `/api/rentals` | logged in |
| GET | `/api/rentals/mine`, `/api/rentals/:id` | owner (or admin) |
| POST | `/api/payments` | logged in |
| POST | `/api/contact` | public |
| GET | `/api/admin/stats`, `/customers`, `/rentals`, `/payments` | admin |
| POST / PUT / DELETE | `/api/admin/clothes[/:id]` | admin |
| PATCH | `/api/admin/rentals/:id/status` | admin |
| GET | `/api/health` | public |

## Project layout
```
backend/   server.js, config/db.js, middleware/auth.js, routes/*, schema.sql, setupDb.js, seed/clothes.json
js/        api.js is the only file that talks to the backend; the other scripts use apiService
```

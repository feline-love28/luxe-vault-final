const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { toClothing } = require('./clothes');
const { toRental, RENTAL_SELECT, parseRentalId } = require('./rentals');
const { toPayment, PAYMENT_SELECT } = require('./payments');

const router = express.Router();

// Every route below needs a valid token AND the admin role
router.use(requireAuth, requireAdmin);

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80';

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
    try {
        const [[{ totalCustomers }]] = await pool.query("SELECT COUNT(*) AS totalCustomers FROM users WHERE role = 'customer'");
        const [[{ totalClothes }]] = await pool.query('SELECT COUNT(*) AS totalClothes FROM clothes');
        const [[{ availableClothes }]] = await pool.query("SELECT COUNT(*) AS availableClothes FROM clothes WHERE availability = 'Available'");
        const [[{ activeRentals }]] = await pool.query("SELECT COUNT(*) AS activeRentals FROM rentals WHERE rental_status IN ('Confirmed', 'Active')");
        const [[{ completedRentals }]] = await pool.query("SELECT COUNT(*) AS completedRentals FROM rentals WHERE rental_status = 'Returned'");
        const [[{ totalRevenue }]] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS totalRevenue FROM payments');

        res.json({
            success: true,
            stats: { totalCustomers, totalClothes, availableClothes, activeRentals, completedRentals, totalRevenue: Number(totalRevenue) }
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/admin/customers
router.get('/customers', async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name, email, phone, address, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC"
        );
        const customers = rows.map(r => ({
            id: 'CUST-' + String(r.id).padStart(3, '0'),
            name: r.name,
            email: r.email,
            phone: r.phone,
            address: r.address,
            joinedDate: r.created_at,
            status: 'Active'
        }));
        res.json({ success: true, customers });
    } catch (err) {
        console.error('Admin customers error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/admin/rentals  (every customer's rentals)
router.get('/rentals', async (req, res) => {
    try {
        const [rows] = await pool.query(`${RENTAL_SELECT} ORDER BY r.id DESC`);
        res.json({ success: true, rentals: rows.map(toRental) });
    } catch (err) {
        console.error('Admin rentals error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// PATCH /api/admin/rentals/:id/status
router.patch('/rentals/:id/status', async (req, res) => {
    const id = parseRentalId(req.params.id);
    const { status } = req.body;

    if (!['Confirmed', 'Active', 'Returned', 'Cancelled'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid rental status.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rentals] = await connection.query('SELECT * FROM rentals WHERE id = ? FOR UPDATE', [id]);
        if (rentals.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Rental not found.' });
        }

        await connection.query('UPDATE rentals SET rental_status = ? WHERE id = ?', [status, id]);

        // Returned or cancelled -> outfit is free again; otherwise it is out with a customer
        const outfitFree = status === 'Returned' || status === 'Cancelled';
        await connection.query(
            'UPDATE clothes SET availability = ? WHERE id = ?',
            [outfitFree ? 'Available' : 'Rented', rentals[0].clothing_id]
        );

        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error('Update rental status error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    } finally {
        connection.release();
    }
});

// GET /api/admin/payments
router.get('/payments', async (req, res) => {
    try {
        const [rows] = await pool.query(`${PAYMENT_SELECT} ORDER BY p.id DESC`);
        res.json({ success: true, payments: rows.map(toPayment) });
    } catch (err) {
        console.error('Admin payments error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// POST /api/admin/clothes
router.post('/clothes', async (req, res) => {
    try {
        const { name, category, size, gender, color, rentalPrice, securityDeposit, image, description } = req.body;

        if (!name || !category || !size || !gender || !color) {
            return res.status(400).json({ success: false, message: 'Name, category, size, gender and color are required.' });
        }
        if (!(Number(rentalPrice) > 0) || !(Number(securityDeposit) >= 0)) {
            return res.status(400).json({ success: false, message: 'Enter a valid rental price and deposit.' });
        }

        const picture = image || DEFAULT_IMAGE;
        const [result] = await pool.query(
            `INSERT INTO clothes
             (name, category, gender, size, color, rental_price, security_deposit, image, images, description, features)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, category, gender, size, color, Number(rentalPrice), Number(securityDeposit), picture,
             JSON.stringify([picture]), description || '', JSON.stringify([])]
        );

        const [rows] = await pool.query('SELECT * FROM clothes WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, clothing: toClothing(rows[0]) });
    } catch (err) {
        console.error('Add clothing error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// PUT /api/admin/clothes/:id
router.put('/clothes/:id', async (req, res) => {
    try {
        const { name, category, size, gender, color, rentalPrice, securityDeposit, image, description } = req.body;

        const [existing] = await pool.query('SELECT * FROM clothes WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Item not found.' });
        }
        const c = existing[0];

        await pool.query(
            `UPDATE clothes SET name = ?, category = ?, gender = ?, size = ?, color = ?,
             rental_price = ?, security_deposit = ?, image = ?, description = ? WHERE id = ?`,
            [name ?? c.name, category ?? c.category, gender ?? c.gender, size ?? c.size, color ?? c.color,
             rentalPrice ?? c.rental_price, securityDeposit ?? c.security_deposit, image || c.image,
             description ?? c.description, c.id]
        );

        const [rows] = await pool.query('SELECT * FROM clothes WHERE id = ?', [c.id]);
        res.json({ success: true, clothing: toClothing(rows[0]) });
    } catch (err) {
        console.error('Update clothing error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// DELETE /api/admin/clothes/:id
router.delete('/clothes/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM clothes WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        // The outfit has rental history, so the database refuses to delete it
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ success: false, message: 'This outfit has rental history and cannot be deleted.' });
        }
        console.error('Delete clothing error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;

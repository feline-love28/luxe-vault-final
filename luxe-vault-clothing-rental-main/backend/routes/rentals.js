const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Rentals joined with the outfit's name and image
const RENTAL_SELECT = `
    SELECT r.*, c.name AS clothing_name, c.image AS clothing_image
    FROM rentals r JOIN clothes c ON c.id = r.clothing_id`;

// Database row -> the object shape the frontend expects
function toRental(row) {
    return {
        id: 'RNT-' + row.id,
        clothingId: row.clothing_id,
        clothingName: row.clothing_name,
        clothingImage: row.clothing_image,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        customerPhone: row.customer_phone,
        deliveryAddress: row.delivery_address,
        startDate: row.start_date,
        returnDate: row.return_date,
        rentalDays: row.rental_days,
        dailyRate: row.daily_rate,
        rentalCost: row.rental_cost,
        securityDeposit: row.security_deposit,
        totalAmount: row.total_amount,
        rentalStatus: row.rental_status,
        paymentStatus: row.payment_status,
        createdAt: String(row.created_at).slice(0, 10)
    };
}

// "RNT-1001" or "1001" -> 1001
function parseRentalId(value) {
    const n = parseInt(String(value).replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? null : n;
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/rentals  (price is calculated here, not trusted from the browser)
router.post('/', requireAuth, async (req, res) => {
    const { clothingId, startDate, returnDate, customerName, customerEmail, customerPhone, customerAddress } = req.body;

    if (!clothingId || !datePattern.test(startDate || '') || !datePattern.test(returnDate || '')) {
        return res.status(400).json({ success: false, message: 'Outfit and valid rental dates are required.' });
    }
    if (!customerName || !customerEmail) {
        return res.status(400).json({ success: false, message: 'Customer name and email are required.' });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (startDate < today) {
        return res.status(400).json({ success: false, message: 'Start date cannot be in the past.' });
    }
    if (returnDate < startDate) {
        return res.status(400).json({ success: false, message: 'Return date must be on or after the start date.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Lock the outfit row so two people can't book it at the same moment
        const [clothes] = await connection.query('SELECT * FROM clothes WHERE id = ? FOR UPDATE', [clothingId]);
        if (clothes.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Outfit not found.' });
        }
        const item = clothes[0];
        if (item.availability !== 'Available') {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'Sorry, this outfit is already rented out.' });
        }

        const dayMs = 24 * 60 * 60 * 1000;
        const diffDays = Math.round((new Date(returnDate) - new Date(startDate)) / dayMs);
        const rentalDays = Math.max(1, diffDays);
        const rentalCost = item.rental_price * rentalDays;
        const totalAmount = rentalCost + item.security_deposit;

        const [result] = await connection.query(
            `INSERT INTO rentals
             (user_id, clothing_id, customer_name, customer_email, customer_phone, delivery_address,
              start_date, return_date, rental_days, daily_rate, rental_cost, security_deposit, total_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, item.id, customerName, customerEmail, customerPhone || '', customerAddress || '',
             startDate, returnDate, rentalDays, item.rental_price, rentalCost, item.security_deposit, totalAmount]
        );

        await connection.query("UPDATE clothes SET availability = 'Rented' WHERE id = ?", [item.id]);
        await connection.commit();

        const [rows] = await pool.query(`${RENTAL_SELECT} WHERE r.id = ?`, [result.insertId]);
        res.status(201).json({ success: true, rental: toRental(rows[0]) });
    } catch (err) {
        await connection.rollback();
        console.error('Create rental error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    } finally {
        connection.release();
    }
});

// GET /api/rentals/mine
router.get('/mine', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(`${RENTAL_SELECT} WHERE r.user_id = ? ORDER BY r.id DESC`, [req.user.id]);
        res.json({ success: true, rentals: rows.map(toRental) });
    } catch (err) {
        console.error('My rentals error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/rentals/:id  (owner or admin only)
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseRentalId(req.params.id);
        const [rows] = await pool.query(`${RENTAL_SELECT} WHERE r.id = ?`, [id]);
        const row = rows[0];
        if (!row || (row.user_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(404).json({ success: false, message: 'Rental record not found.' });
        }
        res.json({ success: true, rental: toRental(row) });
    } catch (err) {
        console.error('Get rental error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
module.exports.toRental = toRental;
module.exports.RENTAL_SELECT = RENTAL_SELECT;
module.exports.parseRentalId = parseRentalId;

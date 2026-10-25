const crypto = require('crypto');
const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { parseRentalId } = require('./rentals');

const router = express.Router();

// Database row (payment joined with its rental) -> the object shape the frontend expects
function toPayment(row) {
    return {
        id: 'PAY-' + row.id,
        rentalId: 'RNT-' + row.rental_id,
        customerName: row.customer_name,
        amount: row.amount,
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        transactionId: row.transaction_id,
        date: String(row.created_at).slice(0, 10)
    };
}

const PAYMENT_SELECT = `
    SELECT p.*, r.customer_name
    FROM payments p JOIN rentals r ON r.id = p.rental_id`;

// POST /api/payments  (simulated payment: no card details are accepted or stored)
router.post('/', requireAuth, async (req, res) => {
    const rentalId = parseRentalId(req.body.rentalId);
    const method = String(req.body.paymentMethod || '').slice(0, 30);

    if (!rentalId || !method) {
        return res.status(400).json({ success: false, message: 'Rental and payment method are required.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // The rental must belong to the logged-in user
        const [rentals] = await connection.query(
            'SELECT * FROM rentals WHERE id = ? AND user_id = ? FOR UPDATE',
            [rentalId, req.user.id]
        );
        const rental = rentals[0];
        if (!rental) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Rental not found.' });
        }
        if (rental.payment_status === 'Paid') {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'This rental is already paid.' });
        }
        if (rental.rental_status === 'Cancelled') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'This rental was cancelled.' });
        }

        // Amount comes from the saved rental, not from the browser
        const transactionId = 'TXN_' + crypto.randomBytes(5).toString('hex').toUpperCase();
        const [result] = await connection.query(
            'INSERT INTO payments (rental_id, user_id, amount, payment_method, transaction_id) VALUES (?, ?, ?, ?, ?)',
            [rental.id, req.user.id, rental.total_amount, method, transactionId]
        );
        await connection.query("UPDATE rentals SET payment_status = 'Paid' WHERE id = ?", [rental.id]);
        await connection.commit();

        const [rows] = await pool.query(`${PAYMENT_SELECT} WHERE p.id = ?`, [result.insertId]);
        res.status(201).json({ success: true, payment: toPayment(rows[0]) });
    } catch (err) {
        await connection.rollback();
        console.error('Payment error:', err);
        res.status(500).json({ success: false, message: 'Payment failed. Please try again.' });
    } finally {
        connection.release();
    }
});

module.exports = router;
module.exports.toPayment = toPayment;
module.exports.PAYMENT_SELECT = PAYMENT_SELECT;

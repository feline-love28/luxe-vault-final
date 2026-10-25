const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// POST /api/contact
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }

        await pool.query(
            'INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
            [name, email, subject || '', message]
        );

        res.status(201).json({ success: true, message: 'Thank you! Your message has been received.' });
    } catch (err) {
        console.error('Contact error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

module.exports = router;

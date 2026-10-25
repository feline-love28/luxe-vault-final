const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shape returned to the frontend (never includes the password hash)
function publicUser(row) {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        role: row.role,
        joinedDate: row.created_at
    };
}

function makeToken(user) {
    return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, phone, address, password } = req.body;

        if (!fullName || !email || !phone || !password) {
            return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
        }
        if (!emailPattern.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must contain at least 6 characters.' });
        }

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password_hash, phone, address) VALUES (?, ?, ?, ?, ?)',
            [fullName, email, passwordHash, phone, address || '']
        );

        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
        const user = publicUser(rows[0]);

        res.status(201).json({
            success: true,
            message: 'Welcome to Luxe Vault! Account created successfully.',
            user,
            token: makeToken(user)
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please fill in both email and password.' });
        }

        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const row = rows[0];

        // Same message for unknown email and wrong password, so emails can't be probed
        if (!row || !(await bcrypt.compare(password, row.password_hash))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = publicUser(row);
        res.json({ success: true, user, token: makeToken(user) });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.json({ success: true, user: publicUser(rows[0]) });
    } catch (err) {
        console.error('Me error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// PUT /api/auth/me  (update name, phone, address)
router.put('/me', requireAuth, async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required.' });
        }

        await pool.query(
            'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?',
            [name, phone || '', address || '', req.user.id]
        );

        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        res.json({ success: true, user: publicUser(rows[0]) });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;

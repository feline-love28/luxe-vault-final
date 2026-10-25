const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// Database row -> the object shape the frontend expects
function toClothing(row) {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        gender: row.gender,
        size: row.size,
        color: row.color,
        rentalPrice: row.rental_price,
        securityDeposit: row.security_deposit,
        availability: row.availability,
        rating: Number(row.rating),
        reviewsCount: row.reviews_count,
        image: row.image,
        images: row.images || [],
        description: row.description,
        features: row.features || []
    };
}

const sortOptions = {
    'price-low': 'rental_price ASC',
    'price-high': 'rental_price DESC',
    'name-az': 'name ASC',
    'name-za': 'name DESC',
    'rating': 'rating DESC'
};

// GET /api/clothes?search=&category=&size=&gender=&color=&availability=&maxPrice=&sortBy=
router.get('/', async (req, res) => {
    try {
        const { search, category, size, gender, color, availability, maxPrice, sortBy } = req.query;
        const where = [];
        const params = [];

        if (search && search.trim()) {
            const like = `%${search.trim().toLowerCase()}%`;
            where.push('(LOWER(name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(color) LIKE ? OR LOWER(description) LIKE ?)');
            params.push(like, like, like, like);
        }
        if (category && category !== 'all') {
            where.push('LOWER(category) = LOWER(?)');
            params.push(category);
        }
        if (size && size !== 'all') {
            where.push('UPPER(size) = UPPER(?)');
            params.push(size);
        }
        if (gender && gender !== 'all') {
            where.push("(LOWER(gender) = LOWER(?) OR LOWER(gender) = 'unisex')");
            params.push(gender);
        }
        if (color && color !== 'all') {
            where.push('LOWER(color) = LOWER(?)');
            params.push(color);
        }
        if (availability && availability !== 'all') {
            where.push('availability = ?');
            params.push(availability);
        }
        if (maxPrice && !isNaN(Number(maxPrice))) {
            where.push('rental_price <= ?');
            params.push(Number(maxPrice));
        }

        // ORDER BY comes from a fixed list, never straight from the request
        const orderBy = sortOptions[sortBy] || 'id ASC';
        const sql = `SELECT * FROM clothes ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${orderBy}`;

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, clothes: rows.map(toClothing) });
    } catch (err) {
        console.error('Clothes list error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/clothes/:id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clothes WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: `Clothing item with ID ${req.params.id} not found.` });
        }
        res.json({ success: true, clothing: toClothing(rows[0]) });
    } catch (err) {
        console.error('Clothes get error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
module.exports.toClothing = toClothing;

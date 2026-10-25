require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/clothes', require('./routes/clothes'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

// Serve the frontend from the project root, so the site and API share one origin
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 5000;

pool.query('SELECT 1')
    .then(() => {
        console.log('Database connected');
        app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    })
    .catch(err => {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    });

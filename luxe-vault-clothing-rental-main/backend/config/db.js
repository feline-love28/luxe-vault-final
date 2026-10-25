const mysql = require('mysql2/promise');

// A pool reuses connections instead of opening a new one per request
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    dateStrings: true, // dates come back as plain 'YYYY-MM-DD' strings (no timezone shifts)
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool;

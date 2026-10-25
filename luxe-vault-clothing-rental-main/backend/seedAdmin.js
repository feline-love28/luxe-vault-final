// Run once: node seedAdmin.js  — creates the admin account used by admin/admin-login.html
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

const ADMIN_EMAIL = 'admin@luxevault.com';
const ADMIN_PASSWORD = 'admin123';

(async () => {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await pool.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'`,
        ['System Administrator', ADMIN_EMAIL, hash]
    );
    console.log(`Admin ready: ${ADMIN_EMAIL}`);
    process.exit(0);
})().catch(err => {
    console.error(err.message);
    process.exit(1);
});

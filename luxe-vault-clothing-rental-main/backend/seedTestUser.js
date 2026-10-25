// Dummy customer for testing the site.
//   node seedTestUser.js            -> create (or reset) the test customer
//   node seedTestUser.js --remove   -> delete it again
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

const TEST_USER = {
    name: 'Test Customer',
    email: 'testcustomer@luxevault.com',
    password: 'Test@1234',
    phone: '+91 90000 11111',
    address: '221B Test Street, Mumbai, Maharashtra'
};

(async () => {
    if (process.argv.includes('--remove')) {
        const [result] = await pool.query('DELETE FROM users WHERE email = ?', [TEST_USER.email]);
        console.log(`Removed ${result.affectedRows} test user(s)`);
    } else {
        const hash = await bcrypt.hash(TEST_USER.password, 10);
        await pool.query(
            `INSERT INTO users (name, email, password_hash, phone, address, role) VALUES (?, ?, ?, ?, ?, 'customer')
             ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash),
                                     phone = VALUES(phone), address = VALUES(address)`,
            [TEST_USER.name, TEST_USER.email, hash, TEST_USER.phone, TEST_USER.address]
        );
        console.log(`Test customer ready: ${TEST_USER.email}`);
    }
    process.exit(0);
})().catch(err => {
    console.error(err.message);
    process.exit(1);
});

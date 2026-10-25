// Run once: npm run setup
// Creates the database + tables from schema.sql, then loads the outfits and the admin user.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    });

    await connection.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    console.log('Tables ready');

    await connection.query('USE ??', [process.env.DB_NAME]);

    // Admin user
    const adminHash = await bcrypt.hash('admin123', 10);
    await connection.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'`,
        ['System Administrator', 'admin@luxevault.com', adminHash]
    );
    console.log('Admin ready: admin@luxevault.com');

    // Outfits (only inserts the ones that don't exist yet, never touches availability)
    const clothes = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed', 'clothes.json'), 'utf8'));
    for (const c of clothes) {
        await connection.query(
            `INSERT IGNORE INTO clothes
             (id, name, category, gender, size, color, rental_price, security_deposit, availability,
              rating, reviews_count, image, images, description, features)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?, ?, ?, ?, ?)`,
            [c.id, c.name, c.category, c.gender, c.size, c.color, c.rentalPrice, c.securityDeposit,
             c.rating, c.reviewsCount, c.image, JSON.stringify(c.images || []), c.description,
             JSON.stringify(c.features || [])]
        );
    }
    const [[{ total }]] = await connection.query('SELECT COUNT(*) AS total FROM clothes');
    console.log(`Outfits in database: ${total}`);

    await connection.end();
})().catch(err => {
    console.error('Setup failed:', err.message);
    process.exit(1);
});

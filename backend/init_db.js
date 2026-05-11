const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const password = process.env.DB_PASSWORD || 'Harshal@06';
    console.log(`Attempting to connect with user: root and password: ${password}`);
    
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: password
        });
        console.log('Connected to MySQL server!');
        
        await connection.query('CREATE DATABASE IF NOT EXISTS ems_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
        console.log('Database ems_attendance created or already exists.');
        
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();

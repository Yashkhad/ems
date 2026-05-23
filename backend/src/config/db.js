const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ems_attendance',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00',
    dateStrings: false
});

// Test connection on startup
pool.getConnection()
    .then(conn => {
        console.log('MySQL connected successfully');
        conn.release();
    })
    .catch(err => {
        console.error('MySQL connection error:', err);
    });

module.exports = pool;

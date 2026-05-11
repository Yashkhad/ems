const mysql = require('mysql2/promise');

async function test() {
    console.log('Testing ems_admin / EMS@2024Secure...');
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'ems_admin',
            password: 'EMS@2024Secure'
        });
        console.log('SUCCESS: Connected as ems_admin');
        await conn.end();
    } catch (e) {
        console.log('FAILED:', e.message);
    }
}

test();

const mysql = require('mysql2/promise');

async function test() {
    console.log('Testing connection to MySQL at 127.0.0.1:3306...');
    try {
        const conn = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3306,
            user: 'root',
            password: 'Harshal@06'
        });
        console.log('SUCCESS: Connected to 127.0.0.1');
        await conn.end();
    } catch (e) {
        console.log('FAILED 127.0.0.1:', e.message);
    }

    console.log('\nTesting connection to MySQL at localhost:3306...');
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'Harshal@06'
        });
        console.log('SUCCESS: Connected to localhost');
        await conn.end();
    } catch (e) {
        console.log('FAILED localhost:', e.message);
    }
}

test();

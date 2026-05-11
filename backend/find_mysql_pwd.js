const mysql = require('mysql2/promise');

async function testPasswords() {
    const user = 'root';
    const passwords = [
        'Harshal@06', 'harshal@06', 'Harshal06', 'harshal06',
        'Harshal@2024', 'Harshal@2025', 'Harshal@2026',
        'Admin@123', 'admin@123', 'Admin123', 'admin123',
        'Gm@12345', 'gm@12345',
        'root', 'admin', 'password', 'mysql', 'MySQL',
        '1234', '123456', '12345678', 'password123',
        'Welcome@123', 'Welcome@1', 'MySql@123',
        'harshal', 'Harshal'
    ];
    
    console.log(`Starting test for ${passwords.length} passwords...`);

    for (const pwd of passwords) {
        try {
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: user,
                password: pwd,
                connectTimeout: 2000
            });
            console.log(`\n!!! SUCCESS !!!`);
            console.log(`User: ${user}`);
            console.log(`Password: ${pwd}`);
            await connection.end();
            process.exit(0);
        } catch (e) {
            // console.log(`Failed: ${pwd} - ${e.message}`);
        }
    }
    
    console.log('\nAll passwords failed.');
    process.exit(1);
}

testPasswords();

const mysql = require('mysql2/promise');

async function testPasswords() {
    const passwords = ['admin', 'admin123', 'mysql', 'MySQL', 'root123', 'rootroot', '123', '12345', '12345678', 'qwerty'];
    for (const pwd of passwords) {
        try {
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: pwd
            });
            console.log(`Success with password: "${pwd}"`);
            await connection.end();
            process.exit(0);
        } catch (e) {
            console.log(`Failed with password: "${pwd}"`);
        }
    }
    console.log('Tested all common passwords. None worked.');
}
testPasswords();

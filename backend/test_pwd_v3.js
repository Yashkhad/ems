const mysql = require('mysql2/promise');

async function testPasswords() {
    const users = ['root', 'ems_admin'];
    const passwords = ['Harshal@06', 'EMS@2024Secure', 'root', 'admin', 'password', ''];
    for (const user of users) {
        for (const pwd of passwords) {
            try {
                const connection = await mysql.createConnection({
                    host: 'localhost',
                    user: user,
                    password: pwd
                });
                console.log(`Success with: User="${user}", Password="${pwd}"`);
                await connection.end();
                process.exit(0);
            } catch (e) {
                // console.log(`Failed with: User="${user}", Password="${pwd}"`);
            }
        }
    }
    console.log('Tested common user/password combinations. None worked.');
}
testPasswords();

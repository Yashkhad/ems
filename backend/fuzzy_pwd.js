const mysql = require('mysql2/promise');

async function test(pwd) {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: pwd,
            connectTimeout: 2000
        });
        console.log(`\nSUCCESS: "${pwd}"`);
        await conn.end();
        process.exit(0);
    } catch (e) {
        // console.log(`Failed: "${pwd}"`);
    }
}

async function run() {
    const bases = ['Harshal', 'harshal', 'Harsh', 'harsh'];
    const separators = ['@', '#', '$', '_', '', ' '];
    const suffixes = ['06', '2024', '2025', '123', '01'];
    
    const pwds = [];
    for (const b of bases) {
        for (const s of separators) {
            for (const suf of suffixes) {
                pwds.push(`${b}${s}${suf}`);
            }
        }
    }
    
    console.log(`Testing ${pwds.length} variations...`);
    for (const p of pwds) {
        await test(p);
    }
    console.log('No luck.');
    process.exit(1);
}

run();

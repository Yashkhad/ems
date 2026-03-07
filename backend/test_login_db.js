const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testLogin(email, password) {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.log(`Test: User ${email} not found`);
            return;
        }
        const isValid = await bcrypt.compare(password, user.passwordHash);
        console.log(`Test: Login for ${email} with password "${password}": ${isValid ? 'SUCCESS' : 'FAILED'}`);
    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

async function runTests() {
    await testLogin('admin@ems.com', 'Admin@123');
    await testLogin('yash.khade@ems.com', 'Gm@12345');
}

runTests();

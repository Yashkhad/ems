const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                email: true,
                status: true,
                role: true
            }
        });
        console.log('Users in DB:', JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Error checking users:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();

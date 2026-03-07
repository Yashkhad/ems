
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAuthMe() {
    try {
        const user = await prisma.user.findFirst();
        if (!user) return;

        console.log(`Testing select for user: ${user.id}`);

        // Attempting to select fields that might be missing
        const userData = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                // Uncomment these one by one to see which ones fail
                // dateOfBirth: true,
                // address: true,
            }
        });

        console.log('User data found');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testAuthMe();

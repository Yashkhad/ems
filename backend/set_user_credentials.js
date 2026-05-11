const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setPasswords() {
    const hashGm = await bcrypt.hash('Gm@12345', 10);
    const hashAdmin123 = await bcrypt.hash('Admin@123', 10);
    
    await prisma.user.updateMany({
        where: { email: 'yash.khade@ems.com' },
        data: { passwordHash: hashGm }
    });
    
    await prisma.user.updateMany({
        where: { email: { in: ['admin@ems.com', 'vedant.katore@ems.com', 'sujal.ghagare@ems.com'] } },
        data: { passwordHash: hashAdmin123 }
    });
    
    console.log('Credentials updated successfully!');
}

setPasswords()
  .catch(e => console.error(e))
  .finally(async () => { await prisma.$disconnect(); });

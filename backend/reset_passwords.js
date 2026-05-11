const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPasswords() {
    const hash = await bcrypt.hash('password123', 10);
    
    await prisma.user.update({
        where: { email: 'admin@ems.com' },
        data: { passwordHash: hash }
    });
    
    await prisma.user.update({
        where: { email: 'sujal.ghagare@ems.com' },
        data: { passwordHash: hash }
    });
    
    console.log('Passwords updated successfully to password123');
}

resetPasswords()
  .catch(e => console.error(e))
  .finally(async () => { await prisma.$disconnect(); });

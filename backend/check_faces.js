const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      faceRegisteredAt: { not: null }
    },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      faceRegisteredAt: true,
      faceDescriptor: true
    }
  });

  console.log('\n--- REGISTERED FACES ---');
  if (users.length === 0) {
    console.log('No faces registered yet.');
  } else {
    users.forEach(u => {
      const descriptorPreview = u.faceDescriptor ? u.faceDescriptor.substring(0, 50) + '...' : 'null';
      console.log(`- ${u.firstName} ${u.lastName} (${u.email})`);
      console.log(`  Registered At: ${u.faceRegisteredAt}`);
      console.log(`  Descriptor: ${descriptorPreview}`);
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

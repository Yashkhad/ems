const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- USERS ---');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      employeeId: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true
    },
    take: 10
  });
  console.table(users);

  console.log('\n--- DEPARTMENTS ---');
  const departments = await prisma.department.findMany({
    take: 5
  });
  console.table(departments);

  console.log('\n--- SHIFTS ---');
  const shifts = await prisma.shift.findMany({
    take: 5
  });
  console.table(shifts);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

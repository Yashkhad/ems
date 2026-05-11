const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      employeeId: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true
    },
    take: 5
  });
  console.log('USERS:');
  users.forEach(u => console.log(`- ${u.firstName} ${u.lastName} (${u.email}) [${u.role}]`));

  const departments = await prisma.department.findMany({ 
    select: { name: true, code: true },
    take: 5 
  });
  console.log('\nDEPARTMENTS:');
  departments.forEach(d => console.log(`- ${d.name} (${d.code})`));

  const shifts = await prisma.shift.findMany({
    select: { name: true, startTime: true, endTime: true },
    take: 5
  });
  console.log('\nSHIFTS:');
  shifts.forEach(s => console.log(`- ${s.name}: ${s.startTime} to ${s.endTime}`));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

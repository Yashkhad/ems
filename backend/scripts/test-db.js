const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count()
  .then(() => { console.log('OK'); process.exit(0); })
  .catch((e) => { console.log('FAIL:', e.message); process.exit(1); });

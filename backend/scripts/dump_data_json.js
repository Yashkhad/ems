const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Dumping SQLite database to JSON...');
  
  try {
    const shifts = await prisma.shift.findMany();
    const departments = await prisma.department.findMany();
    const users = await prisma.user.findMany();
    const leaveBalances = await prisma.leaveBalance.findMany();
    const leaveRequests = await prisma.leaveRequest.findMany();
    const holidays = await prisma.holiday.findMany();
    const attendanceRecords = await prisma.attendanceRecord.findMany();
    const attendanceConfigs = await prisma.attendanceConfig.findMany();
    const auditLogs = await prisma.auditLog.findMany();
    const userSessions = await prisma.userSession.findMany();

    const data = {
      shifts,
      departments,
      users,
      leaveBalances,
      leaveRequests,
      holidays,
      attendanceRecords,
      attendanceConfigs,
      auditLogs,
      userSessions
    };

    const dumpPath = path.join(__dirname, '../data_dump.json');
    fs.writeFileSync(dumpPath, JSON.stringify(data, null, 2));
    console.log(`Successfully dumped data to ${dumpPath}`);
    console.log(`Shifts: ${shifts.length}`);
    console.log(`Departments: ${departments.length}`);
    console.log(`Users: ${users.length}`);
    console.log(`Attendance Records: ${attendanceRecords.length}`);
  } catch (error) {
    console.error('Error dumping database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

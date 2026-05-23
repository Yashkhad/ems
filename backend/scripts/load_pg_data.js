const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const dumpPath = path.join(__dirname, '../data_dump.json');
  if (!fs.existsSync(dumpPath)) {
    console.error(`Dump file not found at ${dumpPath}`);
    process.exit(1);
  }

  console.log('Reading data dump file...');
  const data = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

  console.log('Restoring data to PostgreSQL...');

  try {
    // 1. Shifts
    console.log('Inserting Shifts...');
    for (const shift of data.shifts) {
      await prisma.shift.create({
        data: {
          id: shift.id,
          name: shift.name,
          code: shift.code,
          shiftType: shift.shiftType,
          startTime: new Date(shift.startTime),
          endTime: new Date(shift.endTime),
          gracePeriodMinutes: shift.gracePeriodMinutes,
          halfDayHours: shift.halfDayHours,
          fullDayHours: shift.fullDayHours,
          isActive: shift.isActive,
          createdAt: shift.createdAt ? new Date(shift.createdAt) : undefined,
          updatedAt: shift.updatedAt ? new Date(shift.updatedAt) : undefined
        }
      });
    }

    // 2. Users (First pass - no relations to prevent FK issues)
    console.log('Inserting Users (first pass)...');
    for (const user of data.users) {
      await prisma.user.create({
        data: {
          id: user.id,
          employeeId: user.employeeId,
          email: user.email,
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          status: user.status,
          dateOfJoining: new Date(user.dateOfJoining),
          faceDescriptor: user.faceDescriptor,
          faceRegisteredAt: user.faceRegisteredAt ? new Date(user.faceRegisteredAt) : null,
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
          passwordChangedAt: user.passwordChangedAt ? new Date(user.passwordChangedAt) : null,
          createdAt: user.createdAt ? new Date(user.createdAt) : undefined,
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
          createdBy: user.createdBy // can point to another user, but let's hope order is fine or nullable
        }
      });
    }

    // 3. Departments (First pass - no headId)
    console.log('Inserting Departments (first pass)...');
    for (const dept of data.departments) {
      await prisma.department.create({
        data: {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          description: dept.description,
          isActive: dept.isActive,
          createdAt: dept.createdAt ? new Date(dept.createdAt) : undefined,
          updatedAt: dept.updatedAt ? new Date(dept.updatedAt) : undefined
        }
      });
    }

    // 4. Update User Relations (departmentId, shiftId, managerId)
    console.log('Updating User relations...');
    for (const user of data.users) {
      if (user.managerId || user.departmentId || user.shiftId) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            managerId: user.managerId || null,
            departmentId: user.departmentId || null,
            shiftId: user.shiftId || null
          }
        });
      }
    }

    // 5. Update Department headId
    console.log('Updating Department heads...');
    for (const dept of data.departments) {
      if (dept.headId) {
        await prisma.department.update({
          where: { id: dept.id },
          data: {
            headId: dept.headId
          }
        });
      }
    }

    // 6. Leave Balances
    console.log('Inserting Leave Balances...');
    for (const lb of data.leaveBalances) {
      await prisma.leaveBalance.create({
        data: {
          id: lb.id,
          userId: lb.userId,
          year: lb.year,
          casualTotal: lb.casualTotal,
          casualUsed: lb.casualUsed,
          casualPending: lb.casualPending,
          sickTotal: lb.sickTotal,
          sickUsed: lb.sickUsed,
          sickPending: lb.sickPending,
          paidTotal: lb.paidTotal,
          paidUsed: lb.paidUsed,
          paidPending: lb.paidPending,
          unpaidUsed: lb.unpaidUsed,
          unpaidPending: lb.unpaidPending,
          createdAt: lb.createdAt ? new Date(lb.createdAt) : undefined,
          updatedAt: lb.updatedAt ? new Date(lb.updatedAt) : undefined
        }
      });
    }

    // 7. Leave Requests
    console.log('Inserting Leave Requests...');
    for (const lr of data.leaveRequests) {
      await prisma.leaveRequest.create({
        data: {
          id: lr.id,
          userId: lr.userId,
          leaveType: lr.leaveType,
          startDate: new Date(lr.startDate),
          endDate: new Date(lr.endDate),
          totalDays: lr.totalDays,
          reason: lr.reason,
          status: lr.status,
          approvedById: lr.approvedById || null,
          approvedAt: lr.approvedAt ? new Date(lr.approvedAt) : null,
          rejectionReason: lr.rejectionReason,
          attachmentUrl: lr.attachmentUrl,
          createdAt: lr.createdAt ? new Date(lr.createdAt) : undefined,
          updatedAt: lr.updatedAt ? new Date(lr.updatedAt) : undefined
        }
      });
    }

    // 8. Holidays
    console.log('Inserting Holidays...');
    for (const h of data.holidays) {
      await prisma.holiday.create({
        data: {
          id: h.id,
          name: h.name,
          date: new Date(h.date),
          description: h.description,
          isOptional: h.isOptional,
          year: h.year,
          createdById: h.createdById,
          createdAt: h.createdAt ? new Date(h.createdAt) : undefined,
          updatedAt: h.updatedAt ? new Date(h.updatedAt) : undefined
        }
      });
    }

    // 9. Attendance Records
    console.log('Inserting Attendance Records...');
    for (const ar of data.attendanceRecords) {
      await prisma.attendanceRecord.create({
        data: {
          id: ar.id,
          userId: ar.userId,
          date: new Date(ar.date),
          checkInTime: ar.checkInTime ? new Date(ar.checkInTime) : null,
          checkOutTime: ar.checkOutTime ? new Date(ar.checkOutTime) : null,
          status: ar.status,
          shiftId: ar.shiftId,
          totalHours: ar.totalHours,
          overtimeHours: ar.overtimeHours,
          isFaceVerified: ar.isFaceVerified,
          faceVerificationScore: ar.faceVerificationScore,
          checkInLocation: ar.checkInLocation,
          checkOutLocation: ar.checkOutLocation,
          isManualEntry: ar.isManualEntry,
          manualEntryById: ar.manualEntryById,
          isLocked: ar.isLocked,
          lockedAt: ar.lockedAt ? new Date(ar.lockedAt) : null,
          lockedById: ar.lockedById,
          notes: ar.notes,
          createdAt: ar.createdAt ? new Date(ar.createdAt) : undefined,
          updatedAt: ar.updatedAt ? new Date(ar.updatedAt) : undefined
        }
      });
    }

    // 10. Attendance Config
    console.log('Inserting Config...');
    for (const ac of data.attendanceConfigs) {
      await prisma.attendanceConfig.create({
        data: {
          id: ac.id,
          configKey: ac.configKey,
          configValue: ac.configValue,
          description: ac.description,
          dataType: ac.dataType,
          updatedById: ac.updatedById,
          createdAt: ac.createdAt ? new Date(ac.createdAt) : undefined,
          updatedAt: ac.updatedAt ? new Date(ac.updatedAt) : undefined
        }
      });
    }

    // 11. Audit Logs
    console.log('Inserting Audit Logs...');
    for (const al of data.auditLogs) {
      await prisma.auditLog.create({
        data: {
          id: al.id,
          userId: al.userId,
          action: al.action,
          entityType: al.entityType,
          entityId: al.entityId,
          oldValues: al.oldValues,
          newValues: al.newValues,
          ipAddress: al.ipAddress,
          userAgent: al.userAgent,
          reason: al.reason,
          createdAt: al.createdAt ? new Date(al.createdAt) : undefined
        }
      });
    }

    // 12. User Sessions
    console.log('Inserting Sessions...');
    for (const us of data.userSessions) {
      await prisma.userSession.create({
        data: {
          id: us.id,
          userId: us.userId,
          tokenHash: us.tokenHash,
          ipAddress: us.ipAddress,
          userAgent: us.userAgent,
          isActive: us.isActive,
          expiresAt: new Date(us.expiresAt),
          createdAt: us.createdAt ? new Date(us.createdAt) : undefined,
          lastActivity: us.lastActivity ? new Date(us.lastActivity) : undefined
        }
      });
    }

    console.log('Data restore completed successfully!');
  } catch (error) {
    console.error('Error during data restore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

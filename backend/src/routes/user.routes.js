const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');
const { authenticate, authorize, isAdmin, isHROrAdmin, isGMOrAdmin, isManagerOrAbove, canAccessEmployee } = require('../middleware/auth');
const { userValidation } = require('../middleware/validators');
const { createAuditLog } = require('../middleware/logger');

const canManageUsers = authorize('ADMIN', 'HR', 'GM', 'MANAGER');

// Get next employee ID for a department (preview)
router.get('/next-employee-id/:departmentId', authenticate, canManageUsers, async (req, res, next) => {
    try {
        const dept = await prisma.department.findUnique({
            where: { id: departmentId },
            select: { code: true }
        });
        if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
        const deptCode = dept.code;
        const lastUser = await prisma.user.findFirst({
            where: { employee_id: { startsWith: deptCode } },
            orderBy: { employee_id: 'desc' },
            select: { employee_id: true }
        });
        let nextNumber = 1;
        if (lastUser && lastUser.employee_id) {
            const numPart = lastUser.employee_id.replace(deptCode, '');
            nextNumber = parseInt(numPart, 10) + 1;
        }
        res.json({
            success: true,
            data: { next_employee_id: deptCode + nextNumber.toString().padStart(3, '0'), department_code: deptCode }
        });
    } catch (error) { next(error); }
});

// Get all users
router.get('/', authenticate, canManageUsers, async (req, res, next) => {
    try {
        const { department_id, role, status, search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let conditions = [];
        let params = [];

        if (req.user.role === 'MANAGER') {
            conditions.push('(u.department_id = ? OR u.manager_id = ?)');
            params.push(req.user.department_id, req.user.id);
        } else if (department_id) {
            conditions.push('u.department_id = ?');
            params.push(department_id);
        }

        if (role) { conditions.push('u.role = ?'); params.push(role); }
        if (status) { conditions.push('u.status = ?'); params.push(status); }
        if (search) {
            conditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)');
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        const whereStr = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // Build Prisma where filter based on conditions
        const prismaWhere = {};
        if (req.user.role === 'MANAGER') {
          prismaWhere.OR = [
            { departmentId: req.user.department_id },
            { managerId: req.user.id }
          ];
        } else if (department_id) {
          prismaWhere.departmentId = department_id;
        }
        if (role) prismaWhere.role = role;
        if (status) prismaWhere.status = status;
        if (search) {
          prismaWhere.OR = [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { employee_id: { contains: search, mode: 'insensitive' } }
          ];
        }
        const users = await prisma.user.findMany({
          where: prismaWhere,
          include: { department: true, shift: true, manager: true },
          skip: offset,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        });
        const totalCount = await prisma.user.count({ where: prismaWhere });



        res.json({
            success: true,
            data: users.map(u => ({
                id: u.id, employee_id: u.employee_id, email: u.email,
                first_name: u.first_name, last_name: u.last_name, phone: u.phone,
                role: u.role, status: u.status, is_active: u.status === 'ACTIVE',
                date_of_joining: u.date_of_joining, joining_date: u.date_of_joining,
                face_registered_at: u.face_registered_at, last_login: u.last_login,
                created_at: u.created_at, department_id: u.department_id, shift_id: u.shift_id,
                department_name: u.department?.name,
                shift_name: u.shift?.name,
                manager_name: u.manager ? `${u.manager.firstName} ${u.manager.lastName}` : null,
                manager_id: u.manager_id,
                full_name: `${u.first_name} ${u.last_name}`,
                face_registered: !!u.face_registered_at
            })),
            pagination: {
                page: parseInt(page), limit: parseInt(limit),
                total: totalCount, pages: Math.ceil(totalCount / parseInt(limit))
            }
        });
    } catch (error) { next(error); }
});

// Get team members
router.get('/team/members', authenticate, authorize('MANAGER', 'ADMIN', 'HR'), async (req, res, next) => {
    try {
        let conditions = ["u.status = 'ACTIVE'"];
        let params = [];
        if (req.user.role === 'MANAGER') { conditions.push('u.manager_id = ?'); params.push(req.user.id); }

        const users = await prisma.user.findMany({
          where: {
            status: 'ACTIVE',
            ...(req.user.role === 'MANAGER' ? { managerId: req.user.id } : {})
          },
          include: { department: true, shift: true },
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
        });

        res.json({
            success: true,
            data: users.map(u => ({
                id: u.id, employee_id: u.employee_id, email: u.email,
                first_name: u.first_name, last_name: u.last_name, role: u.role, status: u.status,
                department_name: u.department_name, shift_name: u.shift_name,
                full_name: `${u.first_name} ${u.last_name}`
            }))
        });
    } catch (error) { next(error); }
});

// Get organization hierarchy
router.get('/organization/hierarchy', authenticate, async (req, res, next) => {
    try {
        const gmRows = await prisma.user.findFirst({
          where: { role: 'GM', status: 'ACTIVE' },
          include: { department: true }
        });

        const managers = await prisma.user.findMany({
          where: { role: 'MANAGER', status: 'ACTIVE' },
          include: { department: true },
          orderBy: { department: { name: 'asc' } }
        });

        const empCounts = await prisma.user.groupBy({
          by: ['departmentId'],
          where: { status: 'ACTIVE', departmentId: { not: null } },
          _count: { _all: true }
        });
        const countMap = {};
        empCounts.forEach(c => { countMap[c.department_id] = c.cnt; });

        const departments = await prisma.department.findMany({
          where: { isActive: true },
          include: { head: true },
          orderBy: { name: 'asc' }
        });

        const gm = gmRows.length > 0 ? gmRows[0] : null;

        res.json({
            success: true,
            data: {
                director: gm ? {
                    id: gm.id, employee_id: gm.employee_id, email: gm.email,
                    first_name: gm.first_name, last_name: gm.last_name, phone: gm.phone,
                    role: gm.role, department_name: gm.department?.name,
                    full_name: `${gm.first_name} ${gm.last_name}`, title: 'Director / General Manager'
                } : null,
                department_managers: managers.map(m => ({
                    id: m.id, employee_id: m.employee_id, email: m.email,
                    first_name: m.first_name, last_name: m.last_name, phone: m.phone,
                    role: m.role, department_id: m.department_id, department_name: m.department?.name,
                    department_code: m.department?.code, employee_count: countMap[m.department_id] || 0,
                    full_name: `${m.first_name} ${m.last_name}`
                })),
                departments: departments.map(d => ({
                    department_id: d.id, department_name: d.name, department_code: d.code,
                    head_id: d.head_id,
                    first_name: d.head_first_name, last_name: d.head_last_name,
                    email: d.head_email, role: d.head_role,
                    head_name: d.head_first_name ? `${d.head_first_name} ${d.head_last_name}` : null
                }))
            }
        });
    } catch (error) { next(error); }
});

// Get employees by department
router.get('/department/:departmentId/employees', authenticate, isManagerOrAbove, async (req, res, next) => {
    try {
        const { departmentId } = req.params;
        if (req.user.role === 'MANAGER' && req.user.department_id !== departmentId) {
            return res.status(403).json({ success: false, error: 'You can only view employees in your own department' });
        }

        const users = await prisma.user.findMany({
          where: { departmentId: parseInt(departmentId), status: 'ACTIVE' },
          include: { shift: true, manager: true },
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
        });

        res.json({
            success: true,
            data: users.map(u => ({
                id: u.id, employee_id: u.employee_id, email: u.email,
                first_name: u.first_name, last_name: u.last_name, phone: u.phone,
                role: u.role, status: u.status, date_of_joining: u.date_of_joining,
                shift_name: u.shift_name,
                manager_name: u.manager ? `${u.manager.firstName} ${u.manager.lastName}` : null,
                full_name: `${u.first_name} ${u.last_name}`
            }))
        });
    } catch (error) { next(error); }
});

// Get user by ID
router.get('/:id', authenticate, canAccessEmployee, async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
          where: { id },
          include: { department: true, shift: true, manager: true }
        });

        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const u = user;
        res.json({
            success: true,
            data: {
                id: u.id, employee_id: u.employee_id, email: u.email,
                first_name: u.first_name, last_name: u.last_name, phone: u.phone,
                role: u.role, status: u.status, department_id: u.department_id,
                shift_id: u.shift_id, manager_id: u.manager_id,
                date_of_joining: u.date_of_joining, face_registered_at: u.face_registered_at,
                last_login: u.last_login, created_at: u.created_at, updated_at: u.updated_at,
                department_name: u.department?.name,
                shift_name: u.shift?.name,
                manager_name: u.manager ? `${u.manager.firstName} ${u.manager.lastName}` : null,
                manager_email: u.manager?.email,
                full_name: `${u.first_name} ${u.last_name}`,
                face_registered: !!u.face_registered_at
            }
        });
    } catch (error) { next(error); }
});

// Create new user
router.post('/', authenticate, canManageUsers, userValidation.create, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const { email, password, first_name, last_name, phone, role, department_id, shift_id, manager_id, date_of_joining, joining_date } = req.body;

        if (req.user.role === 'HR' && (role === 'ADMIN' || role === 'GM')) {
            return res.status(403).json({ success: false, error: 'HR cannot assign Admin or GM role' });
        }
        if (req.user.role === 'MANAGER') {
            if (role && role !== 'EMPLOYEE') return res.status(403).json({ success: false, error: 'Manager can only create employees, not other roles' });
            if (department_id && department_id !== req.user.department_id) return res.status(403).json({ success: false, error: 'Manager can only add employees to their own department' });
        }

        const finalDepartmentId = req.user.role === 'MANAGER' ? req.user.department_id : department_id;

        // Generate employee_id using Prisma
        let employee_id;
        if (finalDepartmentId) {
          const dept = await prisma.department.findUnique({
            where: { id: finalDepartmentId },
            select: { code: true }
          });
          if (dept) {
            const deptCode = dept.code;
            const lastUser = await prisma.user.findFirst({
              where: { employee_id: { startsWith: deptCode } },
              orderBy: { employee_id: 'desc' },
              select: { employee_id: true }
            });
            let nextNumber = 1;
            if (lastUser && lastUser.employee_id) {
              const numPart = lastUser.employee_id.replace(deptCode, '');
              nextNumber = parseInt(numPart, 10) + 1;
            }
            employee_id = deptCode + nextNumber.toString().padStart(3, '0');
          }
        }
        if (!employee_id) {
          const lastUser = await prisma.user.findFirst({
            where: { employee_id: { startsWith: 'EMS' } },
            orderBy: { employee_id: 'desc' },
            select: { employee_id: true }
          });
          let nextNumber = 1;
          if (lastUser && lastUser.employee_id) {
            const numPart = lastUser.employee_id.replace('EMS', '');
            nextNumber = parseInt(numPart, 10) + 1;
          }
          employee_id = 'EMS' + nextNumber.toString().padStart(3, '0');
        }

        const finalDateOfJoining = date_of_joining ? new Date(date_of_joining) : joining_date ? new Date(joining_date) : new Date();
        const password_hash = await bcrypt.hash(password, 12);
        const newId = uuidv4();

        // Create new user using Prisma transaction
        const newUser = await prisma.$transaction([
          prisma.user.create({
            data: {
              id: newId,
              employee_id,
              email,
              password_hash,
              first_name,
              last_name,
              phone: phone || null,
              role: role || 'EMPLOYEE',
              status: 'ACTIVE',
              departmentId: finalDepartmentId || undefined,
              shiftId: shift_id || undefined,
              managerId: manager_id || (req.user.role === 'MANAGER' ? req.user.id : undefined),
              date_of_joining: finalDateOfJoining,
              created_by: req.user.id,
              created_at: new Date(),
              updated_at: new Date()
            }
          }),
          prisma.leaveBalance.create({
            data: {
              id: uuidv4(),
              userId: newId,
              year: new Date().getFullYear(),
              created_at: new Date(),
              updated_at: new Date()
            }
          })
        ]);

        await createAuditLog(req.user.id, 'CREATE', 'users', newId, null, { employee_id, email, role: role || 'EMPLOYEE' }, 'New user created', req.ip);

        res.status(201).json({
          success: true,
          message: 'User created successfully',
          data: { id: newId, employee_id, email, first_name, last_name, role: role || 'EMPLOYEE', status: 'ACTIVE' }
        });

        await createAuditLog(req.user.id, 'CREATE', 'users', newId, null, { employee_id, email, role: role || 'EMPLOYEE' }, 'New user created', req.ip);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { id: newId, employee_id, email, first_name, last_name, role: role || 'EMPLOYEE', status: 'ACTIVE' }
        });
    } catch (error) { next(error); }
});

// Update user
router.put('/:id', authenticate, canManageUsers, userValidation.update, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const { id } = req.params;
        const updates = req.body;

        const current = await prisma.user.findUnique({ where: { id } });
        if (!current) return res.status(404).json({ success: false, error: 'User not found' });

        if (req.user.role === 'HR' && updates.role === 'ADMIN') {
            return res.status(403).json({ success: false, error: 'HR cannot assign Admin role' });
        }

        // Update user using Prisma
        const updated = await prisma.user.update({
          where: { id },
          data: {
            ...updates,
            updated_at: new Date()
          },
          select: { id: true, employee_id: true, email: true, first_name: true, last_name: true, role: true, status: true }
        });

        await createAuditLog(req.user.id, 'UPDATE', 'users', id, current, updates, 'User updated', req.ip);

        res.json({ success: true, message: 'User updated successfully', data: updated });
    } catch (error) { next(error); }
});

// Deactivate user
router.patch('/:id/deactivate', authenticate, canManageUsers, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ success: false, error: 'Reason is required for deactivation' });

        const target = await prisma.user.findUnique({ where: { id } });
        if (!target) return res.status(404).json({ success: false, error: 'User not found' });

        const t = target;
        if (t.role === 'GM') return res.status(403).json({ success: false, error: 'Cannot deactivate the General Manager' });
        if (req.user.role === 'MANAGER' && (t.role !== 'EMPLOYEE' || t.department_id !== req.user.department_id)) {
            return res.status(403).json({ success: false, error: 'You can only deactivate employees in your department' });
        }

        // Deactivate user using Prisma
        const deactivated = await prisma.user.update({
          where: { id },
          data: { status: 'INACTIVE', updated_at: new Date() }
        });

        await createAuditLog(req.user.id, 'UPDATE', 'users', id, { status: 'ACTIVE' }, { status: 'INACTIVE' }, reason, req.ip);

        res.json({ success: true, message: 'User deactivated successfully', data: { id, status: 'INACTIVE' } });
    } catch (error) { next(error); }
});

// Delete user
router.delete('/:id', authenticate, canManageUsers, async (req, res, next) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) return res.status(403).json({ success: false, error: 'Cannot delete your own account' });

        const target = await prisma.user.findUnique({ where: { id } });
        if (!target) return res.status(404).json({ success: false, error: 'User not found' });
        const t = target;
        if (t.role === 'GM') return res.status(403).json({ success: false, error: 'Cannot delete the General Manager (Director)' });
        if (req.user.role === 'MANAGER') {
            if (t.role !== 'EMPLOYEE') return res.status(403).json({ success: false, error: 'Managers can only delete employees' });
            if (t.department_id !== req.user.department_id) return res.status(403).json({ success: false, error: 'You can only delete employees in your department' });
        }
        if (req.user.role === 'HR' && (t.role === 'ADMIN' || t.role === 'GM')) {
            return res.status(403).json({ success: false, error: 'HR cannot delete Admin or GM users' });
        }

        // Delete user using Prisma
        await prisma.user.delete({ where: { id } });
        await createAuditLog(req.user.id, 'DELETE', 'users', id, { employee_id: t.employee_id, email: t.email, role: t.role }, null, 'User deleted', req.ip);

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) { next(error); }
});

// Reset user password (Admin only)
router.post('/:id/reset-password', authenticate, isAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password || new_password.length < 8) {
            return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
        }

        const password_hash = await bcrypt.hash(new_password, 12);
        // Reset password using Prisma
        const updated = await prisma.user.update({
          where: { id },
          data: { password_hash, password_changed_at: new Date(), updated_at: new Date() }
        });

        if (!updated) return res.status(404).json({ success: false, error: 'User not found' });

        await createAuditLog(req.user.id, 'UPDATE', 'users', id, null, { action: 'password_reset' }, 'Admin password reset', req.ip);

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) { next(error); }
});

module.exports = router;

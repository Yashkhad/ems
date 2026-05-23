const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { authenticate, authorize, isAdmin, isHROrAdmin, isGMOrAdmin, isManagerOrAbove, canAccessEmployee } = require('../middleware/auth');
const { userValidation } = require('../middleware/validators');
const { createAuditLog } = require('../middleware/logger');

const canManageUsers = authorize('ADMIN', 'HR', 'GM', 'MANAGER');

// Get next employee ID for a department (preview)
router.get('/next-employee-id/:departmentId', authenticate, canManageUsers, async (req, res, next) => {
    try {
        const { departmentId } = req.params;
        const [depts] = await pool.execute('SELECT code FROM departments WHERE id = ?', [departmentId]);
        if (depts.length === 0) return res.status(404).json({ success: false, error: 'Department not found' });

        const deptCode = depts[0].code;
        const [lastUsers] = await pool.execute(
            'SELECT employee_id FROM users WHERE employee_id LIKE ? ORDER BY employee_id DESC LIMIT 1',
            [`${deptCode}%`]
        );

        let nextNumber = 1;
        if (lastUsers.length > 0) {
            const numPart = lastUsers[0].employee_id.replace(deptCode, '');
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

        const [users] = await pool.execute(
            `SELECT u.*, d.name AS department_name, s.name AS shift_name,
                    m.first_name AS mgr_first_name, m.last_name AS mgr_last_name
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             LEFT JOIN shifts s ON u.shift_id = s.id
             LEFT JOIN users m ON u.manager_id = m.id
             ${whereStr}
             ORDER BY u.created_at DESC
             LIMIT ${parseInt(limit)} OFFSET ${offset}`,
            params
        );

        const [countRows] = await pool.execute(
            `SELECT COUNT(*) AS total FROM users u ${whereStr}`, params
        );

        const totalCount = countRows[0].total;

        res.json({
            success: true,
            data: users.map(u => ({
                id: u.id, employee_id: u.employee_id, email: u.email,
                first_name: u.first_name, last_name: u.last_name, phone: u.phone,
                role: u.role, status: u.status, is_active: u.status === 'ACTIVE',
                date_of_joining: u.date_of_joining, joining_date: u.date_of_joining,
                face_registered_at: u.face_registered_at, last_login: u.last_login,
                created_at: u.created_at, department_id: u.department_id, shift_id: u.shift_id,
                department_name: u.department_name, shift_name: u.shift_name,
                manager_name: u.mgr_first_name ? `${u.mgr_first_name} ${u.mgr_last_name}` : null,
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

        const [users] = await pool.execute(
            `SELECT u.*, d.name AS department_name, s.name AS shift_name
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             LEFT JOIN shifts s ON u.shift_id = s.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY u.first_name ASC, u.last_name ASC`,
            params
        );

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
        const [gmRows] = await pool.execute(
            `SELECT u.*, d.name AS department_name FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE u.role = 'GM' AND u.status = 'ACTIVE' LIMIT 1`
        );

        const [managers] = await pool.execute(
            `SELECT u.*, d.id AS dept_id, d.name AS dept_name, d.code AS dept_code
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE u.role = 'MANAGER' AND u.status = 'ACTIVE'
             ORDER BY d.name ASC`
        );

        const [empCounts] = await pool.execute(
            `SELECT department_id, COUNT(*) AS cnt FROM users WHERE status = 'ACTIVE' AND department_id IS NOT NULL GROUP BY department_id`
        );
        const countMap = {};
        empCounts.forEach(c => { countMap[c.department_id] = c.cnt; });

        const [departments] = await pool.execute(
            `SELECT d.*, u.id AS head_user_id, u.first_name AS head_first_name, u.last_name AS head_last_name, u.email AS head_email, u.role AS head_role
             FROM departments d
             LEFT JOIN users u ON d.head_id = u.id
             WHERE d.is_active = 1
             ORDER BY d.name ASC`
        );

        const gm = gmRows.length > 0 ? gmRows[0] : null;

        res.json({
            success: true,
            data: {
                director: gm ? {
                    id: gm.id, employee_id: gm.employee_id, email: gm.email,
                    first_name: gm.first_name, last_name: gm.last_name, phone: gm.phone,
                    role: gm.role, department_name: gm.department_name,
                    full_name: `${gm.first_name} ${gm.last_name}`, title: 'Director / General Manager'
                } : null,
                department_managers: managers.map(m => ({
                    id: m.id, employee_id: m.employee_id, email: m.email,
                    first_name: m.first_name, last_name: m.last_name, phone: m.phone,
                    role: m.role, department_id: m.department_id, department_name: m.dept_name,
                    department_code: m.dept_code, employee_count: countMap[m.department_id] || 0,
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

        const [users] = await pool.execute(
            `SELECT u.*, s.name AS shift_name, m.first_name AS mgr_first, m.last_name AS mgr_last
             FROM users u
             LEFT JOIN shifts s ON u.shift_id = s.id
             LEFT JOIN users m ON u.manager_id = m.id
             WHERE u.department_id = ? AND u.status = 'ACTIVE'
             ORDER BY u.first_name ASC, u.last_name ASC`,
            [departmentId]
        );

        res.json({
            success: true,
            data: users.map(u => ({
                id: u.id, employee_id: u.employee_id, email: u.email,
                first_name: u.first_name, last_name: u.last_name, phone: u.phone,
                role: u.role, status: u.status, date_of_joining: u.date_of_joining,
                shift_name: u.shift_name,
                manager_name: u.mgr_first ? `${u.mgr_first} ${u.mgr_last}` : null,
                full_name: `${u.first_name} ${u.last_name}`
            }))
        });
    } catch (error) { next(error); }
});

// Get user by ID
router.get('/:id', authenticate, canAccessEmployee, async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.execute(
            `SELECT u.*, d.name AS department_name, s.name AS shift_name,
                    m.first_name AS mgr_first, m.last_name AS mgr_last, m.email AS mgr_email
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             LEFT JOIN shifts s ON u.shift_id = s.id
             LEFT JOIN users m ON u.manager_id = m.id
             WHERE u.id = ?`,
            [id]
        );

        if (rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });

        const u = rows[0];
        res.json({
            success: true,
            data: {
                id: u.id, employee_id: u.employee_id, email: u.email,
                first_name: u.first_name, last_name: u.last_name, phone: u.phone,
                role: u.role, status: u.status, department_id: u.department_id,
                shift_id: u.shift_id, manager_id: u.manager_id,
                date_of_joining: u.date_of_joining, face_registered_at: u.face_registered_at,
                last_login: u.last_login, created_at: u.created_at, updated_at: u.updated_at,
                department_name: u.department_name, shift_name: u.shift_name,
                manager_name: u.mgr_first ? `${u.mgr_first} ${u.mgr_last}` : null,
                manager_email: u.mgr_email,
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

        let employee_id;
        if (finalDepartmentId) {
            const [depts] = await pool.execute('SELECT code FROM departments WHERE id = ?', [finalDepartmentId]);
            if (depts.length > 0) {
                const deptCode = depts[0].code;
                const [last] = await pool.execute('SELECT employee_id FROM users WHERE employee_id LIKE ? ORDER BY employee_id DESC LIMIT 1', [`${deptCode}%`]);
                let nextNumber = last.length > 0 ? parseInt(last[0].employee_id.replace(deptCode, ''), 10) + 1 : 1;
                employee_id = deptCode + nextNumber.toString().padStart(3, '0');
            }
        }

        if (!employee_id) {
            const [last] = await pool.execute("SELECT employee_id FROM users WHERE employee_id LIKE 'EMS%' ORDER BY employee_id DESC LIMIT 1");
            let nextNumber = last.length > 0 ? parseInt(last[0].employee_id.replace('EMS', ''), 10) + 1 : 1;
            employee_id = 'EMS' + nextNumber.toString().padStart(3, '0');
        }

        const finalDateOfJoining = date_of_joining ? new Date(date_of_joining) : joining_date ? new Date(joining_date) : new Date();
        const password_hash = await bcrypt.hash(password, 12);
        const newId = uuidv4();

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            await conn.execute(
                `INSERT INTO users (id, employee_id, email, password_hash, first_name, last_name, phone, role, status, department_id, shift_id, manager_id, date_of_joining, created_by, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, NOW(), NOW())`,
                [newId, employee_id, email, password_hash, first_name, last_name, phone || null, role || 'EMPLOYEE',
                 finalDepartmentId || null, shift_id || null,
                 manager_id || (req.user.role === 'MANAGER' ? req.user.id : null),
                 finalDateOfJoining, req.user.id]
            );

            await conn.execute(
                `INSERT INTO leave_balances (id, user_id, year, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
                [uuidv4(), newId, new Date().getFullYear()]
            );

            await conn.commit();
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }

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

        const [current] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (current.length === 0) return res.status(404).json({ success: false, error: 'User not found' });

        if (req.user.role === 'HR' && updates.role === 'ADMIN') {
            return res.status(403).json({ success: false, error: 'HR cannot assign Admin role' });
        }

        const fields = [];
        const params = [];

        if (updates.first_name !== undefined) { fields.push('first_name = ?'); params.push(updates.first_name); }
        if (updates.last_name !== undefined) { fields.push('last_name = ?'); params.push(updates.last_name); }
        if (updates.phone !== undefined) { fields.push('phone = ?'); params.push(updates.phone); }
        if (updates.role !== undefined) { fields.push('role = ?'); params.push(updates.role); }
        if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
        if (updates.is_active !== undefined) { fields.push('status = ?'); params.push(updates.is_active ? 'ACTIVE' : 'INACTIVE'); }
        if (updates.department_id !== undefined) { fields.push('department_id = ?'); params.push(updates.department_id); }
        if (updates.shift_id !== undefined) { fields.push('shift_id = ?'); params.push(updates.shift_id); }
        if (updates.manager_id !== undefined) { fields.push('manager_id = ?'); params.push(updates.manager_id); }
        if (updates.date_of_joining !== undefined) { fields.push('date_of_joining = ?'); params.push(new Date(updates.date_of_joining)); }
        if (updates.joining_date !== undefined) { fields.push('date_of_joining = ?'); params.push(new Date(updates.joining_date)); }

        if (fields.length === 0) return res.status(400).json({ success: false, error: 'No valid fields to update' });

        fields.push('updated_at = NOW()');
        params.push(id);

        await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);

        const [updated] = await pool.execute('SELECT id, employee_id, email, first_name, last_name, role, status FROM users WHERE id = ?', [id]);
        const u = updated[0];

        await createAuditLog(req.user.id, 'UPDATE', 'users', id, current[0], updates, 'User updated', req.ip);

        res.json({ success: true, message: 'User updated successfully', data: { id: u.id, employee_id: u.employee_id, email: u.email, first_name: u.first_name, last_name: u.last_name, role: u.role, status: u.status } });
    } catch (error) { next(error); }
});

// Deactivate user
router.patch('/:id/deactivate', authenticate, canManageUsers, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ success: false, error: 'Reason is required for deactivation' });

        const [target] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (target.length === 0) return res.status(404).json({ success: false, error: 'User not found' });

        const t = target[0];
        if (t.role === 'GM') return res.status(403).json({ success: false, error: 'Cannot deactivate the General Manager' });
        if (req.user.role === 'MANAGER' && (t.role !== 'EMPLOYEE' || t.department_id !== req.user.department_id)) {
            return res.status(403).json({ success: false, error: 'You can only deactivate employees in your department' });
        }

        await pool.execute("UPDATE users SET status = 'INACTIVE', updated_at = NOW() WHERE id = ?", [id]);
        await createAuditLog(req.user.id, 'UPDATE', 'users', id, { status: 'ACTIVE' }, { status: 'INACTIVE' }, reason, req.ip);

        res.json({ success: true, message: 'User deactivated successfully', data: { id, status: 'INACTIVE' } });
    } catch (error) { next(error); }
});

// Delete user
router.delete('/:id', authenticate, canManageUsers, async (req, res, next) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) return res.status(403).json({ success: false, error: 'Cannot delete your own account' });

        const [target] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (target.length === 0) return res.status(404).json({ success: false, error: 'User not found' });

        const t = target[0];
        if (t.role === 'GM') return res.status(403).json({ success: false, error: 'Cannot delete the General Manager (Director)' });
        if (req.user.role === 'MANAGER') {
            if (t.role !== 'EMPLOYEE') return res.status(403).json({ success: false, error: 'Managers can only delete employees' });
            if (t.department_id !== req.user.department_id) return res.status(403).json({ success: false, error: 'You can only delete employees in your department' });
        }
        if (req.user.role === 'HR' && (t.role === 'ADMIN' || t.role === 'GM')) {
            return res.status(403).json({ success: false, error: 'HR cannot delete Admin or GM users' });
        }

        await pool.execute('DELETE FROM users WHERE id = ?', [id]);
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
        const [result] = await pool.execute(
            'UPDATE users SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?',
            [password_hash, id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'User not found' });

        await createAuditLog(req.user.id, 'UPDATE', 'users', id, null, { action: 'password_reset' }, 'Admin password reset', req.ip);

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) { next(error); }
});

module.exports = router;

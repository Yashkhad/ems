const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required. Please provide a valid token.'
            });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database using mysql2
        const [rows] = await pool.execute(
            `SELECT u.*, d.name AS department_name, s.name AS shift_name
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             LEFT JOIN shifts s ON u.shift_id = s.id
             WHERE u.id = ? AND u.status = 'ACTIVE'`,
            [decoded.userId]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive'
            });
        }
        
        const user = rows[0];
        req.user = user;
        req.userId = decoded.userId;
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired. Please login again.'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

// Role-based authorization middleware
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to perform this action',
                required_roles: allowedRoles,
                your_role: req.user.role
            });
        }
        
        next();
    };
};

const isAdmin = authorize('ADMIN');
const isHROrAdmin = authorize('ADMIN', 'HR');
const isGMOrAdmin = authorize('ADMIN', 'GM');
const isManagerOrAbove = authorize('ADMIN', 'HR', 'MANAGER', 'GM');

// Check if user can access specific employee data
const canAccessEmployee = async (req, res, next) => {
    try {
        const targetUserId = req.params.userId || req.params.id;
        const currentUser = req.user;
        
        if (['ADMIN', 'HR', 'GM'].includes(currentUser.role)) {
            return next();
        }
        
        if (currentUser.id === targetUserId) {
            return next();
        }
        
        if (currentUser.role === 'MANAGER') {
            const [rows] = await pool.execute(
                'SELECT id FROM users WHERE manager_id = ? AND id = ?',
                [currentUser.id, targetUserId]
            );
            
            if (rows.length > 0) {
                return next();
            }
        }
        
        return res.status(403).json({
            success: false,
            error: "You do not have permission to access this employee's data"
        });
    } catch (error) {
        console.error('Authorization error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authorization check failed'
        });
    }
};

module.exports = {
    authenticate,
    authorize,
    isAdmin,
    isHROrAdmin,
    isGMOrAdmin,
    isManagerOrAbove,
    canAccessEmployee
};

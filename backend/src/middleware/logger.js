const pool = require('../config/db');

// Request logging middleware
const requestLogger = async (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.userId || null
        };
        
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${new Date().toISOString()}]`, JSON.stringify(logData));
        }
    });
    
    next();
};

// Helper to normalize IP address
const normalizeIpAddress = (ip) => {
    if (!ip) return null;
    if (ip.startsWith('::ffff:')) return ip.substring(7);
    if (ip === '::1') return '127.0.0.1';
    return ip;
};

// Audit logging function using mysql2
const createAuditLog = async (userId, action, entityType, entityId, oldValues, newValues, reason = null, ipAddress = null) => {
    try {
        const { v4: uuidv4 } = require('uuid');
        const normalizedIp = normalizeIpAddress(ipAddress);
        await pool.execute(
            `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, reason, ip_address, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                uuidv4(),
                userId || null,
                action,
                entityType,
                entityId || null,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                reason || null,
                normalizedIp
            ]
        );
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
};

module.exports = {
    requestLogger,
    createAuditLog
};

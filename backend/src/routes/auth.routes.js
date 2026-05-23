const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');
const { createAuditLog } = require('../middleware/logger');
const { toApiUser, toAuthUser } = require('../utils/userMapper');

// Login
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: { department: true, shift: true }
        });
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ success: false, error: 'Account is inactive or suspended. Please contact HR.' });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        const token = jwt.sign(
            { userId: user.id, role: user.role, employeeId: user.employeeId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        await createAuditLog(user.id, 'LOGIN', 'users', user.id, null, null, 'User login', req.ip);

        res.json({
            success: true,
            message: 'Login successful',
            data: { token, user: toAuthUser(user) }
        });
    } catch (error) {
        next(error);
    }
});

// Face Login
router.post('/face-login', async (req, res, next) => {
    try {
        const { face_descriptor } = req.body;

        if (!face_descriptor) {
            return res.status(400).json({ success: false, error: 'Face descriptor is required' });
        }

        const users = await prisma.user.findMany({
            where: { status: 'ACTIVE', faceRegisteredAt: { not: null } },
            include: { department: true, shift: true }
        });

        if (users.length === 0) {
            return res.status(401).json({ success: false, error: 'No registered faces found in the system' });
        }

        let inputDescriptor;
        try {
            inputDescriptor = typeof face_descriptor === 'string' ? JSON.parse(face_descriptor) : face_descriptor;
        } catch (e) {
            return res.status(400).json({ success: false, error: 'Invalid face descriptor format' });
        }

        const threshold = parseFloat(process.env.FACE_RECOGNITION_THRESHOLD) || 0.6;
        let bestUser = null;
        let bestDistance = Infinity;

        for (const user of users) {
            let storedFaceData = user.faceDescriptor;
            if (typeof storedFaceData === 'string') {
                try { storedFaceData = JSON.parse(storedFaceData); } catch (e) {}
            }

            let storedDescriptors = [];
            if (storedFaceData) {
                if (storedFaceData.descriptor) storedDescriptors = [storedFaceData.descriptor];
                else if (storedFaceData.face_descriptors && Array.isArray(storedFaceData.face_descriptors)) storedDescriptors = storedFaceData.face_descriptors;
                else if (Array.isArray(storedFaceData)) storedDescriptors = [storedFaceData];
            }

            for (const storedDescriptor of storedDescriptors) {
                if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== 128) continue;
                const distance = calculateEuclideanDistance(storedDescriptor, inputDescriptor);
                if (distance < bestDistance) { bestDistance = distance; bestUser = user; }
            }
        }

        if (bestUser && bestDistance < threshold) {
            const token = jwt.sign(
                { userId: bestUser.id, role: bestUser.role, employeeId: bestUser.employeeId },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
            );

            await prisma.user.update({
                where: { id: bestUser.id },
                data: { lastLogin: new Date() }
            });

            await createAuditLog(bestUser.id, 'LOGIN', 'users', bestUser.id, null, { method: 'face' }, 'User login via face recognition', req.ip);

            return res.json({
                success: true,
                message: 'Login successful',
                data: { token, user: { ...toAuthUser(bestUser), face_registered: true } }
            });
        }

        return res.status(401).json({ success: false, error: 'Face not recognized. Please make sure you are in a well-lit area.' });

    } catch (error) {
        next(error);
    }
});

// Logout
router.post('/logout', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                await createAuditLog(decoded.userId, 'LOGOUT', 'users', decoded.userId, null, null, 'User logout', req.ip);
            } catch (e) {}
        }

        res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
        next(error);
    }
});

// Change password
router.post('/change-password', [
    body('current_password').notEmpty(),
    body('new_password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { current_password, new_password } = req.body;

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const isValid = await bcrypt.compare(current_password, user.passwordHash);
        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }

        const newPasswordHash = await bcrypt.hash(new_password, 12);
        await prisma.user.update({
            where: { id: decoded.userId },
            data: { passwordHash: newPasswordHash, passwordChangedAt: new Date() }
        });

        await createAuditLog(decoded.userId, 'UPDATE', 'users', decoded.userId, null, { action: 'password_change' }, 'Password changed', req.ip);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        next(error);
    }
});

// Helper function
function calculateEuclideanDistance(descriptor1, descriptor2) {
    if (!Array.isArray(descriptor1) || !Array.isArray(descriptor2)) throw new Error('Invalid descriptors');
    if (descriptor1.length !== descriptor2.length) throw new Error('Descriptor dimensions do not match');
    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
    return Math.sqrt(sum);
}

// Step 1: Initiate password reset
router.post('/forgot-password/initiate', [
    body('email').isEmail().normalizeEmail()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, error: 'No account found with this email address' });
        }
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ success: false, error: 'Account is inactive or suspended. Please contact HR.' });
        }
        if (!user.faceRegisteredAt || !user.faceDescriptor) {
            return res.status(400).json({ success: false, error: 'Face recognition is not registered for this account. Please contact HR to reset your password.' });
        }
        const resetToken = jwt.sign({ userId: user.id, purpose: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '10m' });

        res.json({
            success: true,
            message: 'Email verified. Please verify your face to reset password.',
            data: { reset_token: resetToken, user_name: `${user.firstName} ${user.lastName}`, employee_id: user.employeeId }
        });
    } catch (error) {
        next(error);
    }
});

// Step 2: Verify face and reset password
router.post('/forgot-password/reset', [
    body('reset_token').notEmpty(),
    body('face_descriptor').notEmpty(),
    body('new_password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const { reset_token, face_descriptor, new_password } = req.body;

        let decoded;
        try {
            decoded = jwt.verify(reset_token, process.env.JWT_SECRET);
            if (decoded.purpose !== 'password_reset') throw new Error('Invalid token purpose');
        } catch (e) {
            return res.status(400).json({ success: false, error: 'Reset session expired or invalid. Please start again.' });
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

        if (!user || !user.faceDescriptor) {
            return res.status(400).json({ success: false, error: 'User not found or face not registered' });
        }

        let inputDescriptor;
        try {
            inputDescriptor = typeof face_descriptor === 'string' ? JSON.parse(face_descriptor) : face_descriptor;
        } catch (e) {
            return res.status(400).json({ success: false, error: 'Invalid face descriptor format' });
        }

        let storedFaceData = user.faceDescriptor;
        if (typeof storedFaceData === 'string') { try { storedFaceData = JSON.parse(storedFaceData); } catch (e) {} }

        let storedDescriptors = [];
        if (storedFaceData) {
            if (storedFaceData.descriptor) storedDescriptors = [storedFaceData.descriptor];
            else if (storedFaceData.face_descriptors && Array.isArray(storedFaceData.face_descriptors)) storedDescriptors = storedFaceData.face_descriptors;
            else if (Array.isArray(storedFaceData)) storedDescriptors = [storedFaceData];
        }

        if (storedDescriptors.length === 0) return res.status(400).json({ success: false, error: 'Invalid face registration data. Please contact HR.' });

        const threshold = parseFloat(process.env.FACE_RECOGNITION_THRESHOLD) || 0.6;
        let bestDistance = Infinity;
        for (const storedDescriptor of storedDescriptors) {
            if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== 128) continue;
            const distance = calculateEuclideanDistance(storedDescriptor, inputDescriptor);
            if (distance < bestDistance) bestDistance = distance;
        }

        const confidenceScore = Math.max(0, 1 - bestDistance);
        if (bestDistance >= threshold) {
            await createAuditLog(user.id, 'UPDATE', 'users', user.id, null, { action: 'password_reset_failed', reason: 'face_mismatch' }, 'Password reset failed - face verification failed', req.ip);
            return res.status(401).json({ success: false, error: 'Face verification failed. Please try again or contact HR.', data: { confidence_score: confidenceScore.toFixed(4) } });
        }

        const newPasswordHash = await bcrypt.hash(new_password, 12);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newPasswordHash, passwordChangedAt: new Date() }
        });
        await createAuditLog(user.id, 'UPDATE', 'users', user.id, null, { action: 'password_reset_success', method: 'face_recognition' }, 'Password reset via face recognition', req.ip);

        res.json({
            success: true,
            message: 'Password reset successfully! You can now login with your new password.',
            data: { user_name: `${user.firstName} ${user.lastName}`, confidence_score: confidenceScore.toFixed(4) }
        });
    } catch (error) {
        next(error);
    }
});

// Get current user profile
router.get('/me', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                department: true,
                shift: true,
                manager: true
            }
        });
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const currentYear = new Date().getFullYear();
        const leaveBalances = await prisma.leaveBalance.findMany({ where: { userId: decoded.userId, year: currentYear } });
        const lb = leaveBalances[0] || null;

        const profile = toApiUser(user, {
            start_time: user.shift?.startTime || null,
            end_time: user.shift?.endTime || null,
            manager_email: user.manager?.email || null,
            leave_balance: lb
        });

        res.json({ success: true, data: profile });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

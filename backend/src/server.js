if (!process.env.VERCEL) {
    require('dotenv').config();
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const leaveRoutes = require('./routes/leave.routes');
const departmentRoutes = require('./routes/department.routes');
const shiftRoutes = require('./routes/shift.routes');
const holidayRoutes = require('./routes/holiday.routes');
const reportRoutes = require('./routes/report.routes');
const faceRoutes = require('./routes/face.routes');
const configRoutes = require('./routes/config.routes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
    origin: true, // Reflect request origin (allows any origin in dev)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting (enabled in production)
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { error: 'Too many requests, please try again later.' }
});
if (process.env.NODE_ENV === 'production') {
    app.use('/api/', limiter);
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}
app.use(requestLogger);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check and API routes helper
const registerRoutes = (prefix = '') => {
    app.get(`${prefix}/health`, async (req, res) => {
        let dbStatus = 'unknown';
        try {
            const prisma = require('./config/prisma');
            await prisma.$queryRaw`SELECT 1`;
            dbStatus = 'connected';
        } catch (e) {
            dbStatus = process.env.NODE_ENV === 'production' ? 'error' : e.message;
        }
        res.status(dbStatus === 'connected' ? 200 : 503).json({
            status: dbStatus === 'connected' ? 'healthy' : 'degraded',
            database: dbStatus,
            timestamp: new Date().toISOString(),
            service: 'EMS Attendance API',
            version: '1.0.0'
        });
    });

    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/users`, userRoutes);
    app.use(`${prefix}/attendance`, attendanceRoutes);
    app.use(`${prefix}/leaves`, leaveRoutes);
    app.use(`${prefix}/departments`, departmentRoutes);
    app.use(`${prefix}/shifts`, shiftRoutes);
    app.use(`${prefix}/holidays`, holidayRoutes);
    app.use(`${prefix}/reports`, reportRoutes);
    app.use(`${prefix}/face`, faceRoutes);
    app.use(`${prefix}/config`, configRoutes);
};

// Register routes with and without /api prefix
registerRoutes('/api');
registerRoutes('');

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    // Use absolute path to the built frontend assets
    const frontendPath = path.resolve('frontend/dist');
    app.use(express.static(frontendPath));
    
    // Serve index.html for all non-API routes (client-side routing)
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Error handling middleware
app.use(errorHandler);

// Start server locally; Vercel serverless imports app without listening
if (require.main === module && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`EMS API running on http://localhost:${PORT}/api (${process.env.NODE_ENV || 'development'})`);
    });
}

module.exports = app;

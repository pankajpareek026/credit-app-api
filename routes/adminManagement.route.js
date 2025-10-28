const express = require('express');
const router = express.Router();

// Import admin management controller
const {
    createAdmin,
    getAllAdmins,
    updateAdmin,
    deleteAdmin,
    bulkClientOperations,
    bulkTransactionOperations,
    systemCleanup,
    getSystemReport,
    exportData
} = require('../controllers/adminManagement.controller');

// Import admin middleware
const {
    adminAuth,
    adminAuthorize,
    requireRole,
    adminActivityLogger,
    adminRateLimit,
    validateAdminSession
} = require('../middlewares/adminAuth.middleware');

// Import validation middleware
const { validateRequest } = require('../middleware/validation.middleware');

// Import Joi for validation
const Joi = require('joi');

/**
 * Validation schemas
 */
const createAdminSchema = Joi.object({
    username: Joi.string().min(3).max(20).required().messages({
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username must not exceed 20 characters',
        'string.empty': 'Username is required',
        'any.required': 'Username is required'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Please enter a valid email address',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Password must be at least 8 characters',
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    }),
    firstName: Joi.string().max(50).required().messages({
        'string.max': 'First name must not exceed 50 characters',
        'string.empty': 'First name is required',
        'any.required': 'First name is required'
    }),
    lastName: Joi.string().max(50).required().messages({
        'string.max': 'Last name must not exceed 50 characters',
        'string.empty': 'Last name is required',
        'any.required': 'Last name is required'
    }),
    role: Joi.string().valid('super_admin', 'admin', 'moderator', 'analyst').default('admin'),
    permissions: Joi.object().optional()
});

const updateAdminSchema = Joi.object({
    username: Joi.string().min(3).max(20).optional(),
    email: Joi.string().email().optional(),
    firstName: Joi.string().max(50).optional(),
    lastName: Joi.string().max(50).optional(),
    role: Joi.string().valid('super_admin', 'admin', 'moderator', 'analyst').optional(),
    permissions: Joi.object().optional(),
    isActive: Joi.boolean().optional(),
    isVerified: Joi.boolean().optional()
});

const bulkOperationSchema = Joi.object({
    operation: Joi.string().required(),
    clientIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).optional(),
    transactionIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).optional(),
    data: Joi.object().optional()
});

const systemCleanupSchema = Joi.object({
    operation: Joi.string().valid(
        'cleanup_old_logs',
        'cleanup_inactive_users',
        'cleanup_soft_deleted',
        'cleanup_hidden_transactions',
        'full_cleanup'
    ).required(),
    days: Joi.number().integer().min(1).max(365).default(30)
});

const exportDataSchema = Joi.object({
    dataType: Joi.string().valid(
        'users',
        'clients',
        'transactions',
        'bills',
        'expenses',
        'login_records'
    ).required(),
    format: Joi.string().valid('json', 'csv').default('json'),
    filters: Joi.object().optional()
});

const systemReportSchema = Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    format: Joi.string().valid('json', 'pdf').default('json')
});

/**
 * Admin Management Routes
 */

// Create new admin
router.post('/admins',
    adminAuth,
    validateAdminSession,
    requireRole(['super_admin']),
    adminAuthorize('userManagement.canCreate'),
    adminActivityLogger('create_admin'),
    validateRequest(createAdminSchema),
    createAdmin
);

// Get all admins
router.get('/admins',
    adminAuth,
    validateAdminSession,
    requireRole(['super_admin', 'admin']),
    adminAuthorize('userManagement.canView'),
    adminActivityLogger('view_admins'),
    validateRequest(Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        search: Joi.string().max(100).optional(),
        sortBy: Joi.string().valid('createdAt', 'username', 'email', 'lastLogin').default('createdAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    }), 'query'),
    getAllAdmins
);

// Update admin
router.patch('/admins/:adminId',
    adminAuth,
    validateAdminSession,
    requireRole(['super_admin']),
    adminAuthorize('userManagement.canUpdate'),
    adminActivityLogger('update_admin'),
    validateRequest(updateAdminSchema),
    updateAdmin
);

// Delete admin
router.delete('/admins/:adminId',
    adminAuth,
    validateAdminSession,
    requireRole(['super_admin']),
    adminAuthorize('userManagement.canDelete'),
    adminActivityLogger('delete_admin'),
    deleteAdmin
);

/**
 * Bulk Operations Routes
 */

// Bulk client operations
router.post('/bulk/clients',
    adminAuth,
    validateAdminSession,
    requireRole(['super_admin', 'admin']),
    adminAuthorize('contentManagement.canManageClients'),
    adminActivityLogger('bulk_client_operations'),
    validateRequest(bulkOperationSchema),
    bulkClientOperations
);

// Bulk transaction operations
router.post('/bulk/transactions',
    adminAuth,
    validateAdminSession,
    requireRole(['super_admin', 'admin']),
    adminAuthorize('contentManagement.canManageTransactions'),
    adminActivityLogger('bulk_transaction_operations'),
    validateRequest(bulkOperationSchema),
    bulkTransactionOperations
);

/**
 * System Management Routes
 */

// System cleanup
router.post('/system/cleanup',
    adminAuth,
    validateAdminSession,
    requireRole(['super_admin']),
    adminAuthorize('systemManagement.canManageSettings'),
    adminActivityLogger('system_cleanup'),
    validateRequest(systemCleanupSchema),
    systemCleanup
);

// Get system report
router.get('/system/report',
    adminAuth,
    validateAdminSession,
    adminAuthorize('systemManagement.canViewReports'),
    adminActivityLogger('view_system_report'),
    validateRequest(systemReportSchema, 'query'),
    getSystemReport
);

// Export data
router.post('/system/export',
    adminAuth,
    validateAdminSession,
    adminAuthorize('systemManagement.canViewReports'),
    adminActivityLogger('export_data'),
    validateRequest(exportDataSchema),
    exportData
);

/**
 * Advanced Analytics Routes
 */

// Get user activity analytics
router.get('/analytics/user-activity',
    adminAuth,
    validateAdminSession,
    adminAuthorize('systemManagement.canViewAnalytics'),
    adminActivityLogger('view_user_activity_analytics'),
    async (req, res, next) => {
        try {
            const LoginRecord = require('../Models/loginRecord.modal');
            const { days = 30, userId } = req.query;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            let query = { loginTime: { $gte: cutoffDate } };
            if (userId) {
                query.userId = userId;
            }

            const activityData = await LoginRecord.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: {
                            year: { $year: '$loginTime' },
                            month: { $month: '$loginTime' },
                            day: { $dayOfMonth: '$loginTime' }
                        },
                        loginCount: { $sum: 1 },
                        uniqueUsers: { $addToSet: '$userId' },
                        successfulLogins: {
                            $sum: { $cond: [{ $eq: ['$loginStatus', 'success'] }, 1, 0] }
                        },
                        failedLogins: {
                            $sum: { $cond: [{ $eq: ['$loginStatus', 'failed'] }, 1, 0] }
                        }
                    }
                },
                {
                    $project: {
                        date: '$_id',
                        loginCount: 1,
                        uniqueUsers: { $size: '$uniqueUsers' },
                        successfulLogins: 1,
                        failedLogins: 1
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]);

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'User activity analytics retrieved successfully',
                responseData: {
                    period: `${days} days`,
                    activityData
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get financial analytics
router.get('/analytics/financial',
    adminAuth,
    validateAdminSession,
    adminAuthorize('systemManagement.canViewAnalytics'),
    adminActivityLogger('view_financial_analytics'),
    async (req, res, next) => {
        try {
            const Transaction = require('../Models/transaction.modal');
            const BillReminder = require('../Models/billReminder.modal');
            const Expense = require('../Models/expense.modal');
            const { days = 30 } = req.query;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const [transactionAnalytics, billAnalytics, expenseAnalytics] = await Promise.all([
                Transaction.aggregate([
                    { $match: { createdAt: { $gte: cutoffDate } } },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' }
                            },
                            totalAmount: { $sum: '$amount' },
                            creditAmount: {
                                $sum: { $cond: [{ $eq: ['$type', 'IN'] }, '$amount', 0] }
                            },
                            debitAmount: {
                                $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$amount', 0] }
                            },
                            transactionCount: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
                ]),
                BillReminder.aggregate([
                    { $match: { createdAt: { $gte: cutoffDate } } },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' }
                            },
                            totalAmount: { $sum: '$amount' },
                            pendingAmount: {
                                $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, '$amount', 0] }
                            },
                            overdueAmount: {
                                $sum: { $cond: [{ $eq: ['$status', 'OVERDUE'] }, '$amount', 0] }
                            },
                            billCount: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
                ]),
                Expense.aggregate([
                    { $match: { createdAt: { $gte: cutoffDate } } },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' }
                            },
                            totalAmount: { $sum: '$amount' },
                            expenseCount: { $sum: 1 },
                            averageAmount: { $avg: '$amount' }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
                ])
            ]);

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'Financial analytics retrieved successfully',
                responseData: {
                    period: `${days} days`,
                    analytics: {
                        transactions: transactionAnalytics,
                        bills: billAnalytics,
                        expenses: expenseAnalytics
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get system performance metrics
router.get('/analytics/performance',
    adminAuth,
    validateAdminSession,
    requireRole(['super_admin', 'admin']),
    adminAuthorize('systemManagement.canViewLogs'),
    adminActivityLogger('view_performance_analytics'),
    async (req, res, next) => {
        try {
            const performanceMetrics = {
                timestamp: new Date(),
                system: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage(),
                    version: process.version,
                    platform: process.platform
                },
                database: {
                    readyState: mongoose.connection.readyState,
                    host: mongoose.connection.host,
                    port: mongoose.connection.port,
                    name: mongoose.connection.name
                },
                collections: {
                    users: await mongoose.connection.db.collection('credit-users').countDocuments(),
                    clients: await mongoose.connection.db.collection('clients').countDocuments(),
                    transactions: await mongoose.connection.db.collection('transactions').countDocuments(),
                    bills: await mongoose.connection.db.collection('billreminders').countDocuments(),
                    expenses: await mongoose.connection.db.collection('expenses').countDocuments(),
                    loginRecords: await mongoose.connection.db.collection('loginrecords').countDocuments()
                }
            };

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'Performance metrics retrieved successfully',
                responseData: performanceMetrics
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Security and Monitoring Routes
 */

// Get security alerts
router.get('/security/alerts',
    adminAuth,
    validateAdminSession,
    requireRole(['super_admin', 'admin']),
    adminAuthorize('systemManagement.canViewLogs'),
    adminActivityLogger('view_security_alerts'),
    async (req, res, next) => {
        try {
            const LoginRecord = require('../Models/loginRecord.modal');
            const { days = 7 } = req.query;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const securityAlerts = await LoginRecord.find({
                loginTime: { $gte: cutoffDate },
                $or: [
                    { isSuspicious: true },
                    { loginStatus: 'failed' },
                    { 'suspiciousFlags.0': { $exists: true } }
                ]
            })
                .populate('userId', 'name email')
                .select('-__v')
                .sort({ loginTime: -1 })
                .limit(100);

            // Group alerts by type
            const alertsByType = {
                suspiciousLogins: securityAlerts.filter(alert => alert.isSuspicious),
                failedLogins: securityAlerts.filter(alert => alert.loginStatus === 'failed'),
                unusualActivity: securityAlerts.filter(alert => alert.suspiciousFlags && alert.suspiciousFlags.length > 0)
            };

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'Security alerts retrieved successfully',
                responseData: {
                    period: `${days} days`,
                    totalAlerts: securityAlerts.length,
                    alertsByType,
                    recentAlerts: securityAlerts.slice(0, 20)
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get IP-based analytics
router.get('/security/ip-analytics',
    adminAuth,
    validateAdminSession,
    requireRole(['super_admin', 'admin']),
    adminAuthorize('systemManagement.canViewLogs'),
    adminActivityLogger('view_ip_analytics'),
    async (req, res, next) => {
        try {
            const LoginRecord = require('../Models/loginRecord.modal');
            const { days = 30 } = req.query;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const ipAnalytics = await LoginRecord.aggregate([
                { $match: { loginTime: { $gte: cutoffDate } } },
                {
                    $group: {
                        _id: '$ipAddress',
                        loginCount: { $sum: 1 },
                        uniqueUsers: { $addToSet: '$userId' },
                        successfulLogins: {
                            $sum: { $cond: [{ $eq: ['$loginStatus', 'success'] }, 1, 0] }
                        },
                        failedLogins: {
                            $sum: { $cond: [{ $eq: ['$loginStatus', 'failed'] }, 1, 0] }
                        },
                        suspiciousLogins: {
                            $sum: { $cond: [{ $eq: ['$isSuspicious', true] }, 1, 0] }
                        },
                        lastLogin: { $max: '$loginTime' },
                        locations: { $addToSet: '$location' }
                    }
                },
                {
                    $project: {
                        ipAddress: '$_id',
                        loginCount: 1,
                        uniqueUsers: { $size: '$uniqueUsers' },
                        successfulLogins: 1,
                        failedLogins: 1,
                        suspiciousLogins: 1,
                        lastLogin: 1,
                        locations: 1,
                        riskScore: {
                            $add: [
                                { $multiply: ['$failedLogins', 2] },
                                { $multiply: ['$suspiciousLogins', 5] }
                            ]
                        }
                    }
                },
                { $sort: { riskScore: -1, loginCount: -1 } },
                { $limit: 50 }
            ]);

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'IP analytics retrieved successfully',
                responseData: {
                    period: `${days} days`,
                    ipAnalytics
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;




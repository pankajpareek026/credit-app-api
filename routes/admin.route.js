const express = require('express');
const router = express.Router();

// Import admin controller
const {
    adminLogin,
    adminLogout,
    getDashboardOverview,
    getAllUsers,
    getUserDetails,
    toggleUserStatus,
    getSystemAnalytics
} = require('../controllers/admin.controller');

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
const loginSchema = Joi.object({
    identifier: Joi.string().required().messages({
        'string.empty': 'Username or email is required',
        'any.required': 'Username or email is required'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Password must be at least 8 characters',
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    })
});

const toggleUserStatusSchema = Joi.object({
    action: Joi.string().valid('suspend', 'activate').required().messages({
        'any.only': 'Action must be either suspend or activate',
        'any.required': 'Action is required'
    }),
    reason: Joi.string().max(500).optional().messages({
        'string.max': 'Reason must not exceed 500 characters'
    })
});

const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(100).optional(),
    sortBy: Joi.string().valid('createdAt', 'name', 'email', 'lastLogin').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const analyticsSchema = Joi.object({
    period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
});

/**
 * Authentication Routes
 */

// Admin login
router.post('/login',
    validateRequest(loginSchema),
    adminRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
    adminLogin
);

// Admin logout
router.post('/logout',
    adminAuth,
    validateAdminSession,
    adminActivityLogger('logout'),
    adminLogout
);

/**
 * Dashboard Routes
 */

// Get dashboard overview
router.get('/dashboard',
    adminAuth,
    validateAdminSession,
    adminAuthorize('systemManagement.canViewAnalytics'),
    adminActivityLogger('view_dashboard'),
    getDashboardOverview
);

/**
 * User Management Routes
 */

// Get all users with pagination and filters
router.get('/users',
    adminAuth,
    validateAdminSession,
    adminAuthorize('userManagement.canView'),
    adminActivityLogger('view_users'),
    validateRequest(paginationSchema, 'query'),
    getAllUsers
);

// Get user details
router.get('/users/:userId',
    adminAuth,
    validateAdminSession,
    adminAuthorize('userManagement.canView'),
    adminActivityLogger('view_user_details'),
    getUserDetails
);

// Suspend/activate user
router.patch('/users/:userId/status',
    adminAuth,
    validateAdminSession,
    requireRole(['super_admin', 'admin']),
    adminAuthorize('userManagement.canSuspend'),
    adminActivityLogger('toggle_user_status'),
    validateRequest(toggleUserStatusSchema),
    toggleUserStatus
);

/**
 * Analytics and Reporting Routes
 */

// Get system analytics
router.get('/analytics',
    adminAuth,
    validateAdminSession,
    adminAuthorize('systemManagement.canViewAnalytics'),
    adminActivityLogger('view_analytics'),
    validateRequest(analyticsSchema, 'query'),
    getSystemAnalytics
);

/**
 * System Management Routes
 */

// Get system health
router.get('/health',
    adminAuth,
    validateAdminSession,
    adminAuthorize('systemManagement.canViewLogs'),
    adminActivityLogger('view_system_health'),
    (req, res, next) => {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.version,
                platform: process.platform
            };

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'System health retrieved successfully',
                responseData: health
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get admin profile
router.get('/profile',
    adminAuth,
    validateAdminSession,
    adminActivityLogger('view_profile'),
    (req, res, next) => {
        try {
            const admin = req.body.admin;

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'Admin profile retrieved successfully',
                responseData: {
                    admin: {
                        _id: admin._id,
                        username: admin.username,
                        email: admin.email,
                        firstName: admin.firstName,
                        lastName: admin.lastName,
                        fullName: admin.fullName,
                        role: admin.role,
                        permissions: admin.permissions,
                        isVerified: admin.isVerified,
                        twoFactorEnabled: admin.twoFactorEnabled
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// Update admin profile
router.patch('/profile',
    adminAuth,
    validateAdminSession,
    adminActivityLogger('update_profile'),
    (req, res, next) => {
        try {
            // This would typically update admin profile
            // For now, just return success
            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'Admin profile updated successfully',
                responseData: {
                    admin: req.body.admin
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Content Management Routes
 */

// Get all clients (admin view)
router.get('/clients',
    adminAuth,
    validateAdminSession,
    adminAuthorize('contentManagement.canManageClients'),
    adminActivityLogger('view_all_clients'),
    validateRequest(paginationSchema, 'query'),
    async (req, res, next) => {
        try {
            const Client = require('../Models/client.modal');
            const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            let query = {};
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phoneNumber: { $regex: search, $options: 'i' } }
                ];
            }

            const clients = await Client.find(query)
                .populate('parentId', 'name email')
                .select('-__v')
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(limitNum);

            const totalCount = await Client.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limitNum);

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'Clients retrieved successfully',
                responseData: {
                    clients,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalCount,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPrevPage: pageNum > 1
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get all transactions (admin view)
router.get('/transactions',
    adminAuth,
    validateAdminSession,
    adminAuthorize('contentManagement.canManageTransactions'),
    adminActivityLogger('view_all_transactions'),
    validateRequest(paginationSchema, 'query'),
    async (req, res, next) => {
        try {
            const Transaction = require('../Models/transaction.modal');
            const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            let query = {};
            if (search) {
                query.$or = [
                    { dis: { $regex: search, $options: 'i' } },
                    { type: { $regex: search, $options: 'i' } }
                ];
            }

            const transactions = await Transaction.find(query)
                .populate('parentId', 'name email')
                .populate('clientId', 'name email')
                .select('-__v')
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(limitNum);

            const totalCount = await Transaction.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limitNum);

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'Transactions retrieved successfully',
                responseData: {
                    transactions,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalCount,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPrevPage: pageNum > 1
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get all bill reminders (admin view)
router.get('/bills',
    adminAuth,
    validateAdminSession,
    adminAuthorize('contentManagement.canManageBills'),
    adminActivityLogger('view_all_bills'),
    validateRequest(paginationSchema, 'query'),
    async (req, res, next) => {
        try {
            const BillReminder = require('../Models/billReminder.modal');
            const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            let query = {};
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { provider: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } }
                ];
            }

            const bills = await BillReminder.find(query)
                .populate('parentId', 'name email')
                .select('-__v')
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(limitNum);

            const totalCount = await BillReminder.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limitNum);

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'Bill reminders retrieved successfully',
                responseData: {
                    bills,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalCount,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPrevPage: pageNum > 1
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get all expenses (admin view)
router.get('/expenses',
    adminAuth,
    validateAdminSession,
    adminAuthorize('contentManagement.canManageExpenses'),
    adminActivityLogger('view_all_expenses'),
    validateRequest(paginationSchema, 'query'),
    async (req, res, next) => {
        try {
            const Expense = require('../Models/expense.modal');
            const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            let query = {};
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } },
                    { paymentMethod: { $regex: search, $options: 'i' } }
                ];
            }

            const expenses = await Expense.find(query)
                .populate('parentId', 'name email')
                .select('-__v')
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(limitNum);

            const totalCount = await Expense.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limitNum);

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'Expenses retrieved successfully',
                responseData: {
                    expenses,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalCount,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPrevPage: pageNum > 1
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Security and Monitoring Routes
 */

// Get login records
router.get('/login-records',
    adminAuth,
    validateAdminSession,
    adminAuthorize('systemManagement.canViewLogs'),
    adminActivityLogger('view_login_records'),
    validateRequest(paginationSchema, 'query'),
    async (req, res, next) => {
        try {
            const LoginRecord = require('../Models/loginRecord.modal');
            const { page = 1, limit = 20, search, sortBy = 'loginTime', sortOrder = 'desc' } = req.query;

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            let query = {};
            if (search) {
                query.$or = [
                    { ipAddress: { $regex: search, $options: 'i' } },
                    { userAgent: { $regex: search, $options: 'i' } },
                    { loginStatus: { $regex: search, $options: 'i' } }
                ];
            }

            const loginRecords = await LoginRecord.find(query)
                .populate('userId', 'name email')
                .select('-__v')
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(limitNum);

            const totalCount = await LoginRecord.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limitNum);

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'Login records retrieved successfully',
                responseData: {
                    loginRecords,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalCount,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPrevPage: pageNum > 1
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get suspicious activities
router.get('/suspicious-activities',
    adminAuth,
    validateAdminSession,
    requireRole(['super_admin', 'admin']),
    adminAuthorize('systemManagement.canViewLogs'),
    adminActivityLogger('view_suspicious_activities'),
    async (req, res, next) => {
        try {
            const LoginRecord = require('../Models/loginRecord.modal');

            const suspiciousLogins = await LoginRecord.find({
                $or: [
                    { isSuspicious: true },
                    { loginStatus: 'failed' },
                    { 'suspiciousFlags.0': { $exists: true } }
                ]
            })
                .populate('userId', 'name email')
                .select('-__v')
                .sort({ loginTime: -1 })
                .limit(50);

            res.status(200).json({
                isSuccess: true,
                isError: false,
                message: 'Suspicious activities retrieved successfully',
                responseData: {
                    suspiciousActivities: suspiciousLogins
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;




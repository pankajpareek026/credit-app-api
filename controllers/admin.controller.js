const Admin = require('../Models/admin.modal');
const User = require('../Models/user.modal');
const Client = require('../Models/client.modal');
const Transaction = require('../Models/transaction.modal');
const BillReminder = require('../Models/billReminder.modal');
const Expense = require('../Models/expense.modal');
const LoginRecord = require('../Models/loginRecord.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');
const jwtGenetator = require('../utils/jwtGenerator');
const mongoose = require('mongoose');

/**
 * Admin Authentication Controller
 */

// Admin login
const adminLogin = async (req, res, next) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return next(ApiError.validationError([{
                field: 'credentials',
                message: 'Username/email and password are required',
                value: { identifier, password: '***' }
            }]));
        }

        // Find admin by username or email
        const admin = await Admin.findByCredentials(identifier);

        if (!admin) {
            return next(ApiError.authenticationError('Invalid admin credentials'));
        }

        // Check if account is locked
        if (admin.isLocked) {
            return next(ApiError.authenticationError('Admin account is temporarily locked due to multiple failed login attempts'));
        }

        // Check if admin is active
        if (!admin.isActive) {
            return next(ApiError.authenticationError('Admin account is deactivated'));
        }

        // Compare password
        const isPasswordValid = await admin.comparePassword(password);

        if (!isPasswordValid) {
            // Increment login attempts
            await admin.incLoginAttempts();
            return next(ApiError.authenticationError('Invalid admin credentials'));
        }

        // Reset login attempts on successful login
        if (admin.loginAttempts > 0) {
            await admin.resetLoginAttempts();
        }

        // Update last login
        await admin.updateOne({
            lastLogin: new Date(),
            lastActivity: new Date()
        });

        // Generate JWT token
        const tokenData = {
            _id: admin._id,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            permissions: admin.permissions
        };

        const token = await jwtGenetator(tokenData, "24h");

        if (token.error) {
            return next(ApiError.internalError('Token generation failed'));
        }

        // Return admin data without sensitive information
        const adminData = {
            _id: admin._id,
            username: admin.username,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            fullName: admin.fullName,
            role: admin.role,
            permissions: admin.permissions,
            isVerified: admin.isVerified,
            lastLogin: admin.lastLogin,
            twoFactorEnabled: admin.twoFactorEnabled
        };

        return res.status(200).json(
            ApiResponse.success({
                admin: adminData,
                token: token
            }, 'Admin login successful')
        );

    } catch (error) {
        console.error('Admin login error:', error);
        return next(ApiError.internalError('Admin login failed'));
    }
};

// Admin logout
const adminLogout = async (req, res, next) => {
    try {
        // Update last activity
        if (req.body.admin && req.body.admin._id) {
            await Admin.findByIdAndUpdate(req.body.admin._id, {
                lastActivity: new Date()
            });
        }

        return res.status(200).json(
            ApiResponse.success(null, 'Admin logout successful')
        );

    } catch (error) {
        console.error('Admin logout error:', error);
        return next(ApiError.internalError('Admin logout failed'));
    }
};

/**
 * Admin Dashboard Controller
 */

// Get admin dashboard overview
const getDashboardOverview = async (req, res, next) => {
    try {
        const adminId = req.body.admin._id;

        // Get system statistics
        const [
            userStats,
            clientStats,
            transactionStats,
            billStats,
            expenseStats,
            loginStats,
            adminStats
        ] = await Promise.all([
            getUserStatistics(),
            getClientStatistics(),
            getTransactionStatistics(),
            getBillReminderStatistics(),
            getExpenseStatistics(),
            getLoginStatistics(),
            Admin.getAdminStats()
        ]);

        // Get recent activities
        const recentActivities = await getRecentActivities();

        // Get system health
        const systemHealth = await getSystemHealth();

        const dashboardData = {
            overview: {
                totalUsers: userStats.totalUsers,
                activeUsers: userStats.activeUsers,
                totalClients: clientStats.totalClients,
                totalTransactions: transactionStats.totalTransactions,
                totalBills: billStats.totalBills,
                totalExpenses: expenseStats.totalExpenses,
                totalAdmins: adminStats.totalAdmins
            },
            statistics: {
                users: userStats,
                clients: clientStats,
                transactions: transactionStats,
                bills: billStats,
                expenses: expenseStats,
                logins: loginStats,
                admins: adminStats
            },
            recentActivities,
            systemHealth
        };

        return res.status(200).json(
            ApiResponse.success(dashboardData, 'Dashboard overview retrieved successfully')
        );

    } catch (error) {
        console.error('Dashboard overview error:', error);
        return next(ApiError.internalError('Failed to retrieve dashboard overview'));
    }
};

/**
 * User Management Controller
 */

// Get all users with pagination and filters
const getAllUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
            return next(ApiError.validationError([{
                field: 'pagination',
                message: 'Invalid pagination parameters',
                value: { page: pageNum, limit: limitNum }
            }]));
        }

        const skip = (pageNum - 1) * limitNum;

        // Build query
        let query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Get users with pagination
        const users = await User.find(query)
            .select('-pass -token') // Exclude sensitive data
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count
        const totalCount = await User.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limitNum);

        // Get user statistics
        const userStats = await getUserStatistics();

        const responseData = {
            users,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            },
            statistics: userStats
        };

        return res.status(200).json(
            ApiResponse.success(responseData, 'Users retrieved successfully')
        );

    } catch (error) {
        console.error('Get all users error:', error);
        return next(ApiError.internalError('Failed to retrieve users'));
    }
};

// Get user details
const getUserDetails = async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return next(ApiError.validationError([{
                field: 'userId',
                message: 'Invalid user ID format',
                value: userId
            }]));
        }

        // Get user details
        const user = await User.findById(userId).select('-pass -token');
        if (!user) {
            return next(ApiError.notFoundError('User not found'));
        }

        // Get user's clients
        const clients = await Client.find({ parentId: userId, isActive: true })
            .select('name phoneNumber email totalBalance lastTransactionDate createdAt')
            .sort({ createdAt: -1 })
            .limit(10);

        // Get user's recent transactions
        const transactions = await Transaction.find({ parentId: userId })
            .populate('clientId', 'name')
            .select('amount date dis type createdAt')
            .sort({ createdAt: -1 })
            .limit(10);

        // Get user's login history
        const loginHistory = await LoginRecord.getUserLoginHistory(userId, 10, 0);

        // Get user statistics
        const userStats = await getUserStatistics(userId);

        const userDetails = {
            user,
            clients,
            recentTransactions: transactions,
            loginHistory,
            statistics: userStats
        };

        return res.status(200).json(
            ApiResponse.success(userDetails, 'User details retrieved successfully')
        );

    } catch (error) {
        console.error('Get user details error:', error);
        return next(ApiError.internalError('Failed to retrieve user details'));
    }
};

// Suspend/activate user
const toggleUserStatus = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { action, reason } = req.body; // action: 'suspend' or 'activate'

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return next(ApiError.validationError([{
                field: 'userId',
                message: 'Invalid user ID format',
                value: userId
            }]));
        }

        if (!['suspend', 'activate'].includes(action)) {
            return next(ApiError.validationError([{
                field: 'action',
                message: 'Action must be either suspend or activate',
                value: action
            }]));
        }

        const user = await User.findById(userId);
        if (!user) {
            return next(ApiError.notFoundError('User not found'));
        }

        // For now, we'll use a simple approach - in a real system, you might want to add a status field
        // Since the current user model doesn't have a status field, we'll add metadata
        const updateData = {
            metadata: {
                ...user.metadata,
                status: action === 'suspend' ? 'suspended' : 'active',
                statusReason: reason || '',
                statusChangedBy: req.body.admin._id,
                statusChangedAt: new Date().toISOString()
            }
        };

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select('-pass -token');

        return res.status(200).json(
            ApiResponse.success(updatedUser, `User ${action}d successfully`)
        );

    } catch (error) {
        console.error('Toggle user status error:', error);
        return next(ApiError.internalError('Failed to update user status'));
    }
};

/**
 * Analytics and Reporting Controller
 */

// Get system analytics
const getSystemAnalytics = async (req, res, next) => {
    try {
        const { period = '30d', startDate, endDate } = req.query;

        // Calculate date range
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        } else {
            const days = parseInt(period.replace('d', ''));
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            dateFilter = { createdAt: { $gte: startDate } };
        }

        // Get analytics data
        const [
            userAnalytics,
            transactionAnalytics,
            billAnalytics,
            expenseAnalytics,
            loginAnalytics
        ] = await Promise.all([
            getUserAnalytics(dateFilter),
            getTransactionAnalytics(dateFilter),
            getBillAnalytics(dateFilter),
            getExpenseAnalytics(dateFilter),
            getLoginAnalytics(dateFilter)
        ]);

        const analyticsData = {
            period,
            dateRange: {
                startDate: dateFilter.createdAt?.$gte || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                endDate: dateFilter.createdAt?.$lte || new Date()
            },
            analytics: {
                users: userAnalytics,
                transactions: transactionAnalytics,
                bills: billAnalytics,
                expenses: expenseAnalytics,
                logins: loginAnalytics
            }
        };

        return res.status(200).json(
            ApiResponse.success(analyticsData, 'System analytics retrieved successfully')
        );

    } catch (error) {
        console.error('Get system analytics error:', error);
        return next(ApiError.internalError('Failed to retrieve system analytics'));
    }
};

/**
 * Helper Functions
 */

// Get user statistics
async function getUserStatistics(userId = null) {
    const matchQuery = userId ? { _id: mongoose.Types.ObjectId(userId) } : {};

    const stats = await User.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: { $sum: 1 }, // All users are considered active in current model
                newUsersToday: {
                    $sum: {
                        $cond: [
                            { $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))] },
                            1,
                            0
                        ]
                    }
                },
                newUsersThisWeek: {
                    $sum: {
                        $cond: [
                            { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                            1,
                            0
                        ]
                    }
                },
                newUsersThisMonth: {
                    $sum: {
                        $cond: [
                            { $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);

    return stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0
    };
}

// Get client statistics
async function getClientStatistics() {
    const stats = await Client.aggregate([
        {
            $group: {
                _id: null,
                totalClients: { $sum: 1 },
                activeClients: {
                    $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                },
                totalBalance: { $sum: '$totalBalance' },
                averageBalance: { $avg: '$totalBalance' }
            }
        }
    ]);

    return stats[0] || {
        totalClients: 0,
        activeClients: 0,
        totalBalance: 0,
        averageBalance: 0
    };
}

// Get transaction statistics
async function getTransactionStatistics() {
    const stats = await Transaction.aggregate([
        {
            $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                averageAmount: { $avg: '$amount' },
                creditTransactions: {
                    $sum: { $cond: [{ $eq: ['$type', 'IN'] }, 1, 0] }
                },
                debitTransactions: {
                    $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, 1, 0] }
                },
                creditAmount: {
                    $sum: { $cond: [{ $eq: ['$type', 'IN'] }, '$amount', 0] }
                },
                debitAmount: {
                    $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$amount', 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        averageAmount: 0,
        creditTransactions: 0,
        debitTransactions: 0,
        creditAmount: 0,
        debitAmount: 0
    };
}

// Get bill reminder statistics
async function getBillReminderStatistics() {
    const stats = await BillReminder.aggregate([
        {
            $group: {
                _id: null,
                totalBills: { $sum: 1 },
                pendingBills: {
                    $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
                },
                paidBills: {
                    $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] }
                },
                overdueBills: {
                    $sum: { $cond: [{ $eq: ['$status', 'OVERDUE'] }, 1, 0] }
                },
                totalAmount: { $sum: '$amount' },
                pendingAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, '$amount', 0] }
                },
                overdueAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'OVERDUE'] }, '$amount', 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalBills: 0,
        pendingBills: 0,
        paidBills: 0,
        overdueBills: 0,
        totalAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0
    };
}

// Get expense statistics
async function getExpenseStatistics() {
    const stats = await Expense.aggregate([
        {
            $group: {
                _id: null,
                totalExpenses: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                averageAmount: { $avg: '$amount' },
                activeExpenses: {
                    $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalExpenses: 0,
        totalAmount: 0,
        averageAmount: 0,
        activeExpenses: 0
    };
}

// Get login statistics
async function getLoginStatistics() {
    const stats = await LoginRecord.aggregate([
        {
            $group: {
                _id: null,
                totalLogins: { $sum: 1 },
                successfulLogins: {
                    $sum: { $cond: [{ $eq: ['$loginStatus', 'success'] }, 1, 0] }
                },
                failedLogins: {
                    $sum: { $cond: [{ $eq: ['$loginStatus', 'failed'] }, 1, 0] }
                },
                suspiciousLogins: {
                    $sum: { $cond: [{ $eq: ['$isSuspicious', true] }, 1, 0] }
                },
                uniqueUsers: { $addToSet: '$userId' }
            }
        },
        {
            $project: {
                totalLogins: 1,
                successfulLogins: 1,
                failedLogins: 1,
                suspiciousLogins: 1,
                uniqueUsers: { $size: '$uniqueUsers' }
            }
        }
    ]);

    return stats[0] || {
        totalLogins: 0,
        successfulLogins: 0,
        failedLogins: 0,
        suspiciousLogins: 0,
        uniqueUsers: 0
    };
}

// Get recent activities
async function getRecentActivities() {
    const activities = [];

    // Get recent user registrations
    const recentUsers = await User.find()
        .select('name email createdAt')
        .sort({ createdAt: -1 })
        .limit(5);

    recentUsers.forEach(user => {
        activities.push({
            type: 'user_registration',
            description: `New user registered: ${user.name}`,
            timestamp: user.createdAt,
            data: { userId: user._id, email: user.email }
        });
    });

    // Get recent transactions
    const recentTransactions = await Transaction.find()
        .populate('parentId', 'name')
        .populate('clientId', 'name')
        .select('amount type dis createdAt parentId clientId')
        .sort({ createdAt: -1 })
        .limit(5);

    recentTransactions.forEach(transaction => {
        activities.push({
            type: 'transaction',
            description: `Transaction: ${transaction.type === 'IN' ? '+' : '-'}${transaction.amount} - ${transaction.dis}`,
            timestamp: transaction.createdAt,
            data: {
                userId: transaction.parentId?._id,
                userName: transaction.parentId?.name,
                clientId: transaction.clientId?._id,
                clientName: transaction.clientId?.name
            }
        });
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return activities.slice(0, 10);
}

// Get system health
async function getSystemHealth() {
    const health = {
        status: 'healthy',
        timestamp: new Date(),
        checks: {}
    };

    try {
        // Database connection check
        const dbState = mongoose.connection.readyState;
        health.checks.database = {
            status: dbState === 1 ? 'healthy' : 'unhealthy',
            state: dbState
        };

        // Memory usage
        const memUsage = process.memoryUsage();
        health.checks.memory = {
            status: 'healthy',
            usage: {
                rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB'
            }
        };

        // Uptime
        health.checks.uptime = {
            status: 'healthy',
            uptime: Math.round(process.uptime()) + ' seconds'
        };

        // Overall status
        const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
        health.status = allHealthy ? 'healthy' : 'degraded';

    } catch (error) {
        health.status = 'unhealthy';
        health.error = error.message;
    }

    return health;
}

// Get user analytics
async function getUserAnalytics(dateFilter) {
    return await User.aggregate([
        { $match: dateFilter },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
}

// Get transaction analytics
async function getTransactionAnalytics(dateFilter) {
    return await Transaction.aggregate([
        { $match: dateFilter },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                creditAmount: {
                    $sum: { $cond: [{ $eq: ['$type', 'IN'] }, '$amount', 0] }
                },
                debitAmount: {
                    $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$amount', 0] }
                }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
}

// Get bill analytics
async function getBillAnalytics(dateFilter) {
    return await BillReminder.aggregate([
        { $match: dateFilter },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                pendingAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, '$amount', 0] }
                },
                overdueAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'OVERDUE'] }, '$amount', 0] }
                }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
}

// Get expense analytics
async function getExpenseAnalytics(dateFilter) {
    return await Expense.aggregate([
        { $match: dateFilter },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                averageAmount: { $avg: '$amount' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
}

// Get login analytics
async function getLoginAnalytics(dateFilter) {
    return await LoginRecord.aggregate([
        { $match: dateFilter },
        {
            $group: {
                _id: {
                    year: { $year: '$loginTime' },
                    month: { $month: '$loginTime' },
                    day: { $dayOfMonth: '$loginTime' }
                },
                count: { $sum: 1 },
                successfulLogins: {
                    $sum: { $cond: [{ $eq: ['$loginStatus', 'success'] }, 1, 0] }
                },
                failedLogins: {
                    $sum: { $cond: [{ $eq: ['$loginStatus', 'failed'] }, 1, 0] }
                },
                suspiciousLogins: {
                    $sum: { $cond: [{ $eq: ['$isSuspicious', true] }, 1, 0] }
                }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
}

module.exports = {
    // Authentication
    adminLogin,
    adminLogout,

    // Dashboard
    getDashboardOverview,

    // User Management
    getAllUsers,
    getUserDetails,
    toggleUserStatus,

    // Analytics
    getSystemAnalytics
};


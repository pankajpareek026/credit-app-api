const Admin = require('../Models/admin.modal');
const User = require('../Models/user.modal');
const Client = require('../Models/client.modal');
const Transaction = require('../Models/transaction.modal');
const BillReminder = require('../Models/billReminder.modal');
const Expense = require('../Models/expense.modal');
const LoginRecord = require('../Models/loginRecord.modal');
const Note = require('../Models/note.modal');
const TaskTree = require('../Models/taskTree.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');
const mongoose = require('mongoose');

/**
 * Comprehensive Admin Management Controller
 * Handles all admin operations for managing the entire system
 */

/**
 * Admin Management
 */

// Create new admin
const createAdmin = async (req, res, next) => {
    try {
        const {
            username,
            email,
            password,
            firstName,
            lastName,
            role = 'admin',
            permissions
        } = req.body;

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({
            $or: [{ username }, { email }]
        });

        if (existingAdmin) {
            return next(ApiError.conflictError('Admin with this username or email already exists'));
        }

        // Create new admin
        const admin = new Admin({
            username,
            email,
            password,
            firstName,
            lastName,
            role,
            permissions: permissions || getDefaultPermissions(role),
            createdBy: req.body.admin._id
        });

        await admin.save();

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
            isActive: admin.isActive,
            isVerified: admin.isVerified,
            createdAt: admin.createdAt
        };

        return res.status(201).json(
            ApiResponse.success(adminData, 'Admin created successfully')
        );

    } catch (error) {
        console.error('Create admin error:', error);
        return next(ApiError.internalError('Failed to create admin'));
    }
};

// Get all admins
const getAllAdmins = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        let query = {};
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }

        const admins = await Admin.find(query)
            .select('-password -twoFactorSecret')
            .populate('createdBy', 'username firstName lastName')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limitNum);

        const totalCount = await Admin.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limitNum);

        const responseData = {
            admins,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        };

        return res.status(200).json(
            ApiResponse.success(responseData, 'Admins retrieved successfully')
        );

    } catch (error) {
        console.error('Get all admins error:', error);
        return next(ApiError.internalError('Failed to retrieve admins'));
    }
};

// Update admin
const updateAdmin = async (req, res, next) => {
    try {
        const { adminId } = req.params;
        const updateData = req.body;

        if (!mongoose.Types.ObjectId.isValid(adminId)) {
            return next(ApiError.validationError([{
                field: 'adminId',
                message: 'Invalid admin ID format',
                value: adminId
            }]));
        }

        // Remove sensitive fields that shouldn't be updated directly
        delete updateData.password;
        delete updateData.twoFactorSecret;
        delete updateData.createdBy;

        const admin = await Admin.findByIdAndUpdate(
            adminId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -twoFactorSecret');

        if (!admin) {
            return next(ApiError.notFoundError('Admin not found'));
        }

        return res.status(200).json(
            ApiResponse.success(admin, 'Admin updated successfully')
        );

    } catch (error) {
        console.error('Update admin error:', error);
        return next(ApiError.internalError('Failed to update admin'));
    }
};

// Delete admin
const deleteAdmin = async (req, res, next) => {
    try {
        const { adminId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(adminId)) {
            return next(ApiError.validationError([{
                field: 'adminId',
                message: 'Invalid admin ID format',
                value: adminId
            }]));
        }

        // Prevent deleting self
        if (adminId === req.body.admin._id) {
            return next(ApiError.validationError([{
                field: 'adminId',
                message: 'Cannot delete your own account',
                value: adminId
            }]));
        }

        const admin = await Admin.findByIdAndDelete(adminId);

        if (!admin) {
            return next(ApiError.notFoundError('Admin not found'));
        }

        return res.status(200).json(
            ApiResponse.success(null, 'Admin deleted successfully')
        );

    } catch (error) {
        console.error('Delete admin error:', error);
        return next(ApiError.internalError('Failed to delete admin'));
    }
};

/**
 * Content Management - Advanced Operations
 */

// Bulk operations for clients
const bulkClientOperations = async (req, res, next) => {
    try {
        const { operation, clientIds, data } = req.body;

        if (!Array.isArray(clientIds) || clientIds.length === 0) {
            return next(ApiError.validationError([{
                field: 'clientIds',
                message: 'Client IDs array is required',
                value: clientIds
            }]));
        }

        let result;
        switch (operation) {
            case 'activate':
                result = await Client.updateMany(
                    { _id: { $in: clientIds } },
                    { isActive: true }
                );
                break;
            case 'deactivate':
                result = await Client.updateMany(
                    { _id: { $in: clientIds } },
                    { isActive: false }
                );
                break;
            case 'delete':
                result = await Client.deleteMany({ _id: { $in: clientIds } });
                break;
            case 'update':
                if (!data) {
                    return next(ApiError.validationError([{
                        field: 'data',
                        message: 'Update data is required for update operation',
                        value: data
                    }]));
                }
                result = await Client.updateMany(
                    { _id: { $in: clientIds } },
                    { $set: data }
                );
                break;
            default:
                return next(ApiError.validationError([{
                    field: 'operation',
                    message: 'Invalid operation. Supported: activate, deactivate, delete, update',
                    value: operation
                }]));
        }

        return res.status(200).json(
            ApiResponse.success({
                operation,
                affectedCount: result.modifiedCount || result.deletedCount || 0,
                totalRequested: clientIds.length
            }, `Bulk ${operation} operation completed successfully`)
        );

    } catch (error) {
        console.error('Bulk client operations error:', error);
        return next(ApiError.internalError('Failed to perform bulk client operations'));
    }
};

// Bulk operations for transactions
const bulkTransactionOperations = async (req, res, next) => {
    try {
        const { operation, transactionIds, data } = req.body;

        if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
            return next(ApiError.validationError([{
                field: 'transactionIds',
                message: 'Transaction IDs array is required',
                value: transactionIds
            }]));
        }

        let result;
        switch (operation) {
            case 'hide':
                result = await Transaction.updateMany(
                    { _id: { $in: transactionIds } },
                    { hidden: true }
                );
                break;
            case 'unhide':
                result = await Transaction.updateMany(
                    { _id: { $in: transactionIds } },
                    { hidden: false }
                );
                break;
            case 'delete':
                result = await Transaction.deleteMany({ _id: { $in: transactionIds } });
                break;
            case 'update':
                if (!data) {
                    return next(ApiError.validationError([{
                        field: 'data',
                        message: 'Update data is required for update operation',
                        value: data
                    }]));
                }
                result = await Transaction.updateMany(
                    { _id: { $in: transactionIds } },
                    { $set: data }
                );
                break;
            default:
                return next(ApiError.validationError([{
                    field: 'operation',
                    message: 'Invalid operation. Supported: hide, unhide, delete, update',
                    value: operation
                }]));
        }

        return res.status(200).json(
            ApiResponse.success({
                operation,
                affectedCount: result.modifiedCount || result.deletedCount || 0,
                totalRequested: transactionIds.length
            }, `Bulk ${operation} operation completed successfully`)
        );

    } catch (error) {
        console.error('Bulk transaction operations error:', error);
        return next(ApiError.internalError('Failed to perform bulk transaction operations'));
    }
};

// System cleanup operations
const systemCleanup = async (req, res, next) => {
    try {
        const { operation, days = 30 } = req.body;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        let result = {};

        switch (operation) {
            case 'cleanup_old_logs':
                result.loginRecords = await LoginRecord.deleteMany({
                    loginTime: { $lt: cutoffDate },
                    loginStatus: 'success'
                });
                break;
            case 'cleanup_inactive_users':
                // This would require adding an isActive field to User model
                result.users = { message: 'User cleanup requires isActive field implementation' };
                break;
            case 'cleanup_soft_deleted':
                result.clients = await Client.deleteMany({
                    isActive: false,
                    updatedAt: { $lt: cutoffDate }
                });
                result.expenses = await Expense.deleteMany({
                    isActive: false,
                    updatedAt: { $lt: cutoffDate }
                });
                break;
            case 'cleanup_hidden_transactions':
                result.transactions = await Transaction.deleteMany({
                    hidden: true,
                    updatedAt: { $lt: cutoffDate }
                });
                break;
            case 'full_cleanup':
                result = await performFullCleanup(cutoffDate);
                break;
            default:
                return next(ApiError.validationError([{
                    field: 'operation',
                    message: 'Invalid cleanup operation',
                    value: operation
                }]));
        }

        return res.status(200).json(
            ApiResponse.success(result, `System cleanup (${operation}) completed successfully`)
        );

    } catch (error) {
        console.error('System cleanup error:', error);
        return next(ApiError.internalError('Failed to perform system cleanup'));
    }
};

/**
 * Advanced Analytics and Reporting
 */

// Get comprehensive system report
const getSystemReport = async (req, res, next) => {
    try {
        const { startDate, endDate, format = 'json' } = req.query;

        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Get comprehensive statistics
        const [
            userStats,
            clientStats,
            transactionStats,
            billStats,
            expenseStats,
            loginStats,
            adminStats,
            systemHealth,
            topUsers,
            recentActivities
        ] = await Promise.all([
            getUserStatistics(dateFilter),
            getClientStatistics(dateFilter),
            getTransactionStatistics(dateFilter),
            getBillReminderStatistics(dateFilter),
            getExpenseStatistics(dateFilter),
            getLoginStatistics(dateFilter),
            Admin.getAdminStats(),
            getSystemHealth(),
            getTopUsers(dateFilter),
            getRecentActivities(dateFilter)
        ]);

        const systemReport = {
            reportInfo: {
                generatedAt: new Date(),
                generatedBy: req.body.admin.username,
                period: { startDate, endDate },
                format
            },
            overview: {
                totalUsers: userStats.totalUsers,
                activeUsers: userStats.activeUsers,
                totalClients: clientStats.totalClients,
                totalTransactions: transactionStats.totalTransactions,
                totalBills: billStats.totalBills,
                totalExpenses: expenseStats.totalExpenses,
                totalAdmins: adminStats.totalAdmins
            },
            detailedStats: {
                users: userStats,
                clients: clientStats,
                transactions: transactionStats,
                bills: billStats,
                expenses: expenseStats,
                logins: loginStats,
                admins: adminStats
            },
            topUsers,
            recentActivities,
            systemHealth
        };

        return res.status(200).json(
            ApiResponse.success(systemReport, 'System report generated successfully')
        );

    } catch (error) {
        console.error('Get system report error:', error);
        return next(ApiError.internalError('Failed to generate system report'));
    }
};

// Export data
const exportData = async (req, res, next) => {
    try {
        const { dataType, format = 'json', filters = {} } = req.body;

        let data;
        let filename;

        switch (dataType) {
            case 'users':
                data = await User.find(filters).select('-pass -token');
                filename = `users_export_${Date.now()}.${format}`;
                break;
            case 'clients':
                data = await Client.find(filters).populate('parentId', 'name email');
                filename = `clients_export_${Date.now()}.${format}`;
                break;
            case 'transactions':
                data = await Transaction.find(filters)
                    .populate('parentId', 'name email')
                    .populate('clientId', 'name email');
                filename = `transactions_export_${Date.now()}.${format}`;
                break;
            case 'bills':
                data = await BillReminder.find(filters).populate('parentId', 'name email');
                filename = `bills_export_${Date.now()}.${format}`;
                break;
            case 'expenses':
                data = await Expense.find(filters).populate('parentId', 'name email');
                filename = `expenses_export_${Date.now()}.${format}`;
                break;
            case 'login_records':
                data = await LoginRecord.find(filters).populate('userId', 'name email');
                filename = `login_records_export_${Date.now()}.${format}`;
                break;
            default:
                return next(ApiError.validationError([{
                    field: 'dataType',
                    message: 'Invalid data type for export',
                    value: dataType
                }]));
        }

        // Set appropriate headers based on format
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            // Convert to CSV (simplified implementation)
            const csv = convertToCSV(data);
            return res.send(csv);
        } else {
            return res.status(200).json(
                ApiResponse.success({
                    data,
                    filename,
                    recordCount: data.length,
                    exportedAt: new Date()
                }, 'Data exported successfully')
            );
        }

    } catch (error) {
        console.error('Export data error:', error);
        return next(ApiError.internalError('Failed to export data'));
    }
};

/**
 * Helper Functions
 */

// Get default permissions based on role
function getDefaultPermissions(role) {
    const permissions = {
        userManagement: {
            canView: false,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
            canSuspend: false
        },
        systemManagement: {
            canViewAnalytics: false,
            canViewLogs: false,
            canManageSettings: false,
            canViewReports: false
        },
        contentManagement: {
            canManageClients: false,
            canManageTransactions: false,
            canManageBills: false,
            canManageExpenses: false,
            canManageTasks: false
        }
    };

    switch (role) {
        case 'super_admin':
            // Super admin has all permissions
            Object.keys(permissions).forEach(category => {
                Object.keys(permissions[category]).forEach(permission => {
                    permissions[category][permission] = true;
                });
            });
            break;
        case 'admin':
            // Admin has most permissions except system settings
            permissions.userManagement.canView = true;
            permissions.userManagement.canCreate = true;
            permissions.userManagement.canUpdate = true;
            permissions.userManagement.canSuspend = true;
            permissions.systemManagement.canViewAnalytics = true;
            permissions.systemManagement.canViewLogs = true;
            permissions.systemManagement.canViewReports = true;
            permissions.contentManagement.canManageClients = true;
            permissions.contentManagement.canManageTransactions = true;
            permissions.contentManagement.canManageBills = true;
            permissions.contentManagement.canManageExpenses = true;
            permissions.contentManagement.canManageTasks = true;
            break;
        case 'moderator':
            // Moderator has limited permissions
            permissions.userManagement.canView = true;
            permissions.userManagement.canSuspend = true;
            permissions.systemManagement.canViewAnalytics = true;
            permissions.contentManagement.canManageClients = true;
            permissions.contentManagement.canManageTransactions = true;
            permissions.contentManagement.canManageBills = true;
            permissions.contentManagement.canManageExpenses = true;
            break;
        case 'analyst':
            // Analyst has read-only permissions
            permissions.userManagement.canView = true;
            permissions.systemManagement.canViewAnalytics = true;
            permissions.systemManagement.canViewReports = true;
            permissions.contentManagement.canManageClients = true;
            permissions.contentManagement.canManageTransactions = true;
            permissions.contentManagement.canManageBills = true;
            permissions.contentManagement.canManageExpenses = true;
            break;
    }

    return permissions;
}

// Perform full system cleanup
async function performFullCleanup(cutoffDate) {
    const results = {};

    try {
        // Cleanup old successful login records
        results.loginRecords = await LoginRecord.deleteMany({
            loginTime: { $lt: cutoffDate },
            loginStatus: 'success'
        });

        // Cleanup soft deleted clients
        results.clients = await Client.deleteMany({
            isActive: false,
            updatedAt: { $lt: cutoffDate }
        });

        // Cleanup soft deleted expenses
        results.expenses = await Expense.deleteMany({
            isActive: false,
            updatedAt: { $lt: cutoffDate }
        });

        // Cleanup hidden transactions
        results.transactions = await Transaction.deleteMany({
            hidden: true,
            updatedAt: { $lt: cutoffDate }
        });

        return results;
    } catch (error) {
        console.error('Full cleanup error:', error);
        throw error;
    }
}

// Get top users by activity
async function getTopUsers(dateFilter) {
    const pipeline = [
        { $match: dateFilter },
        {
            $group: {
                _id: '$parentId',
                transactionCount: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        },
        { $sort: { transactionCount: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: 'credit-users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $project: {
                userId: '$_id',
                userName: '$user.name',
                userEmail: '$user.email',
                transactionCount: 1,
                totalAmount: 1
            }
        }
    ];

    return await Transaction.aggregate(pipeline);
}

// Convert data to CSV format
function convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row => {
        const values = headers.map(header => {
            const value = row[header];
            return typeof value === 'object' ? JSON.stringify(value) : value;
        });
        return values.join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
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

// Get user statistics (reuse from main controller)
async function getUserStatistics(dateFilter = {}) {
    const stats = await User.aggregate([
        { $match: dateFilter },
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: { $sum: 1 },
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

// Get client statistics (reuse from main controller)
async function getClientStatistics(dateFilter = {}) {
    const stats = await Client.aggregate([
        { $match: dateFilter },
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

// Get transaction statistics (reuse from main controller)
async function getTransactionStatistics(dateFilter = {}) {
    const stats = await Transaction.aggregate([
        { $match: dateFilter },
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

// Get bill reminder statistics (reuse from main controller)
async function getBillReminderStatistics(dateFilter = {}) {
    const stats = await BillReminder.aggregate([
        { $match: dateFilter },
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

// Get expense statistics (reuse from main controller)
async function getExpenseStatistics(dateFilter = {}) {
    const stats = await Expense.aggregate([
        { $match: dateFilter },
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

// Get login statistics (reuse from main controller)
async function getLoginStatistics(dateFilter = {}) {
    const stats = await LoginRecord.aggregate([
        { $match: dateFilter },
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

// Get recent activities (reuse from main controller)
async function getRecentActivities(dateFilter = {}) {
    const activities = [];

    // Get recent user registrations
    const recentUsers = await User.find(dateFilter)
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
    const recentTransactions = await Transaction.find(dateFilter)
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

module.exports = {
    // Admin Management
    createAdmin,
    getAllAdmins,
    updateAdmin,
    deleteAdmin,

    // Content Management
    bulkClientOperations,
    bulkTransactionOperations,
    systemCleanup,

    // Analytics and Reporting
    getSystemReport,
    exportData
};

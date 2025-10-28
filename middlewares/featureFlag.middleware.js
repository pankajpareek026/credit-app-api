const ApiError = require('../utils/apiError.utils');

/**
 * Feature Flag Middleware
 * 
 * This middleware checks if a user has the required feature flag enabled
 * before allowing access to protected routes.
 */

/**
 * Middleware to check if user has a specific feature flag
 * @param {string} featureFlag - The feature flag to check
 * @returns {Function} Express middleware function
 */
const featureFlagMiddleware = (featureFlag) => {
    return (req, res, next) => {
        try {
            const user = req.body.user;
            
            if (!user) {
                return next(ApiError.unauthorizedError('User not authenticated'));
            }

            // Check if user has the required feature flag
            const hasFeatureFlag = user.featureFlags?.[featureFlag] || false;
            
            if (!hasFeatureFlag) {
                return next(ApiError.authorizationError(`Access denied. Required feature flag: ${featureFlag}`));
            }

            next();
        } catch (error) {
            console.error('Feature flag middleware error:', error);
            return next(ApiError.internalError('Feature flag validation failed'));
        }
    };
};

/**
 * Middleware to check if user has admin role
 * @param {Array<string>} allowedRoles - Array of allowed admin roles
 * @returns {Function} Express middleware function
 */
const adminRoleMiddleware = (allowedRoles = ['admin', 'super_admin']) => {
    return (req, res, next) => {
        try {
            const user = req.body.user;
            
            if (!user) {
                return next(ApiError.unauthorizedError('User not authenticated'));
            }

            // Check if user is admin and has allowed role
            if (!user.isAdmin || !allowedRoles.includes(user.adminRole)) {
                return next(ApiError.authorizationError('Admin access required'));
            }

            next();
        } catch (error) {
            console.error('Admin role middleware error:', error);
            return next(ApiError.internalError('Admin role validation failed'));
        }
    };
};

/**
 * Set default feature flags based on user role
 * @param {Object} user - User object
 * @param {string} role - User role
 * @returns {Object} Default feature flags
 */
const setDefaultFeatureFlags = (user, role = 'user') => {
    const defaultFlags = {
        canViewAnalytics: false,
        canManageUsers: false,
        canManageSystem: false,
        canViewReports: false,
        canManageClients: false,
        canManageTransactions: false,
        canManageBills: false,
        canManageExpenses: false,
        canManageTasks: false,
        canManageNotes: false,
        canManageVault: false,
        canViewSystemHealth: false,
        canExportData: false,
        canBulkOperations: false
    };

    switch (role) {
        case 'super_admin':
            // Super admin gets all permissions
            return Object.keys(defaultFlags).reduce((acc, key) => {
                acc[key] = true;
                return acc;
            }, {});
            
        case 'admin':
            // Admin gets most permissions except system management
            return {
                ...defaultFlags,
                canViewAnalytics: true,
                canManageUsers: true,
                canViewReports: true,
                canManageClients: true,
                canManageTransactions: true,
                canManageBills: true,
                canManageExpenses: true,
                canManageTasks: true,
                canManageNotes: true,
                canManageVault: true,
                canExportData: true,
                canBulkOperations: true
            };
            
        case 'moderator':
            // Moderator gets limited permissions
            return {
                ...defaultFlags,
                canViewAnalytics: true,
                canViewReports: true,
                canManageClients: true,
                canManageTransactions: true,
                canManageBills: true,
                canManageExpenses: true,
                canManageTasks: true,
                canManageNotes: true
            };
            
        default:
            // Regular user gets no admin permissions
            return defaultFlags;
    }
};

/**
 * Get user feature flags with proper formatting
 * @param {Object} user - User object
 * @returns {Object} Formatted feature flags
 */
const getUserFeatureFlags = (user) => {
    if (!user || !user.isAdmin) {
        return {
            canAccessAdminPanel: false,
            featureFlags: {}
        };
    }

    return {
        canAccessAdminPanel: ['admin', 'super_admin'].includes(user.adminRole),
        featureFlags: user.featureFlags || {}
    };
};

module.exports = {
    featureFlagMiddleware,
    adminRoleMiddleware,
    setDefaultFeatureFlags,
    getUserFeatureFlags
};

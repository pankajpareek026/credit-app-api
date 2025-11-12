const jwt = require('jsonwebtoken');
const Admin = require('../Models/admin.modal');
const ApiError = require('../utils/apiError.utils');

/**
 * Admin Authentication Middleware
 * Verifies JWT token and attaches admin data to request
 */
const adminAuth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(ApiError.authenticationError('Access denied. No token provided or invalid format.'));
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!token) {
            return next(ApiError.authenticationError('Access denied. No token provided.'));
        }

        // Verify token
        const decoded = jwt.verify(token, "WeShoulHaveAStrongPriVaTeKek@24-12-2022");

        if (!decoded) {
            return next(ApiError.authenticationError('Invalid token.'));
        }

        // Find admin by ID
        const admin = await Admin.findById(decoded._id).select('-password');

        if (!admin) {
            return next(ApiError.authenticationError('Admin not found.'));
        }

        // Check if admin is active
        if (!admin.isActive) {
            return next(ApiError.authenticationError('Admin account is deactivated.'));
        }

        // Check if admin is locked
        if (admin.isLocked) {
            return next(ApiError.authenticationError('Admin account is temporarily locked.'));
        }

        // Update last activity
        await admin.updateOne({ lastActivity: new Date() });

        // Attach admin data to request
        req.body.admin = {
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
        };

        next();

    } catch (error) {
        console.error('Admin auth middleware error:', error);

        if (error.name === 'JsonWebTokenError') {
            return next(ApiError.authenticationError('Invalid token.'));
        }

        if (error.name === 'TokenExpiredError') {
            return next(ApiError.authenticationError('Token expired.'));
        }

        return next(ApiError.internalError('Authentication failed.'));
    }
};

/**
 * Admin Authorization Middleware
 * Checks if admin has required permissions
 */
const adminAuthorize = (requiredPermissions) => {
    return (req, res, next) => {
        try {
            const admin = req.body.admin;

            if (!admin) {
                return next(ApiError.authenticationError('Admin authentication required.'));
            }

            // Super admin has all permissions
            if (admin.role === 'super_admin') {
                return next();
            }

            // Check specific permissions
            const hasPermission = checkPermissions(admin.permissions, requiredPermissions);

            if (!hasPermission) {
                return next(ApiError.authorizationError('Insufficient permissions.'));
            }

            next();

        } catch (error) {
            console.error('Admin authorization middleware error:', error);
            return next(ApiError.internalError('Authorization check failed.'));
        }
    };
};

/**
 * Role-based Authorization Middleware
 * Checks if admin has required role level
 */
const requireRole = (requiredRoles) => {
    return (req, res, next) => {
        try {
            const admin = req.body.admin;

            if (!admin) {
                return next(ApiError.authenticationError('Admin authentication required.'));
            }

            // Convert to array if single role provided
            const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

            // Check if admin has one of the required roles
            if (!roles.includes(admin.role)) {
                return next(ApiError.authorizationError('Insufficient role privileges.'));
            }

            next();

        } catch (error) {
            console.error('Role authorization middleware error:', error);
            return next(ApiError.internalError('Role authorization check failed.'));
        }
    };
};

/**
 * Helper function to check permissions recursively
 */
function checkPermissions(userPermissions, requiredPermissions) {
    // If requiredPermissions is a string, convert to object structure
    if (typeof requiredPermissions === 'string') {
        const parts = requiredPermissions.split('.');
        if (parts.length === 2) {
            requiredPermissions = {
                [parts[0]]: {
                    [parts[1]]: true
                }
            };
        }
    }

    // Check each required permission
    for (const [category, permissions] of Object.entries(requiredPermissions)) {
        if (!userPermissions[category]) {
            return false;
        }

        for (const [permission, required] of Object.entries(permissions)) {
            if (required && !userPermissions[category][permission]) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Admin Activity Logger Middleware
 * Logs admin actions for audit trail
 */
const adminActivityLogger = (action) => {
    return (req, res, next) => {
        try {
            const admin = req.body.admin;

            if (admin) {
                // Log admin activity
                const activityLog = {
                    adminId: admin._id,
                    adminUsername: admin.username,
                    action: action,
                    timestamp: new Date(),
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent'),
                    endpoint: req.originalUrl,
                    method: req.method,
                    params: req.params,
                    query: req.query,
                    body: sanitizeRequestBody(req.body)
                };

                // In a production system, you might want to save this to a database
                console.log('Admin Activity:', JSON.stringify(activityLog, null, 2));
            }

            next();

        } catch (error) {
            console.error('Admin activity logger error:', error);
            // Don't fail the request if logging fails
            next();
        }
    };
};

/**
 * Helper function to sanitize request body for logging
 */
function sanitizeRequestBody(body) {
    const sanitized = { ...body };

    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.admin; // Remove admin data from body

    return sanitized;
}

/**
 * Rate Limiting Middleware for Admin Actions
 * Prevents abuse of admin endpoints
 */
const adminRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();

    return (req, res, next) => {
        try {
            const admin = req.body.admin;

            if (!admin) {
                return next();
            }

            const adminId = admin._id.toString();
            const now = Date.now();
            const windowStart = now - windowMs;

            // Clean old entries
            if (requests.has(adminId)) {
                const adminRequests = requests.get(adminId);
                const validRequests = adminRequests.filter(time => time > windowStart);
                requests.set(adminId, validRequests);
            } else {
                requests.set(adminId, []);
            }

            const adminRequests = requests.get(adminId);

            // Check if limit exceeded
            if (adminRequests.length >= maxRequests) {
                return next(ApiError.rateLimitError('Too many requests. Please try again later.'));
            }

            // Add current request
            adminRequests.push(now);

            next();

        } catch (error) {
            console.error('Admin rate limit middleware error:', error);
            // Don't fail the request if rate limiting fails
            next();
        }
    };
};

/**
 * Admin Session Validation Middleware
 * Validates admin session and updates activity
 */
const validateAdminSession = async (req, res, next) => {
    try {
        const admin = req.body.admin;

        if (!admin) {
            return next();
        }

        // Check if admin session is still valid
        const adminDoc = await Admin.findById(admin._id);

        if (!adminDoc || !adminDoc.isActive) {
            return next(ApiError.authenticationError('Admin session is no longer valid.'));
        }

        // Update last activity
        await adminDoc.updateOne({ lastActivity: new Date() });

        next();

    } catch (error) {
        console.error('Admin session validation error:', error);
        return next(ApiError.internalError('Session validation failed.'));
    }
};

module.exports = {
    adminAuth,
    adminAuthorize,
    requireRole,
    adminActivityLogger,
    adminRateLimit,
    validateAdminSession
};




const ApiError = require("../utils/apiError.utils");
const { requestLogger } = require("../middleware/security.middleware");

/**
 * Enhanced error handler middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (error, req, res, next) => {
    const appStage = process.env.NODE_ENV || 'development';
    const isDevelopment = appStage === 'development';

    // Set request context for ApiError instances
    if (error instanceof ApiError) {
        error.setRequestContext(req);
    }

    // Log error details
    const errorLog = {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        userId: req.body?.user?._id || req.user?._id,
        requestId: req.headers['x-request-id'] || req.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        error: {
            name: error.name,
            message: error.message,
            stack: isDevelopment ? error.stack : undefined,
            statusCode: error.statusCode || 500,
            isOperational: error.isOperational !== false
        }
    };

    // Log error (in production, you might want to send this to a logging service)
    console.error('Error Handler:', JSON.stringify(errorLog, null, 2));

    // Handle different types of errors
    if (error instanceof ApiError) {
        // Handle custom API errors
        const response = error.toResponse();
        
        // Add rate limit headers if applicable
        if (error.statusCode === 429) {
            res.set({
                'X-RateLimit-Limit': req.rateLimit?.limit,
                'X-RateLimit-Remaining': req.rateLimit?.remaining,
                'X-RateLimit-Reset': req.rateLimit?.resetTime
            });
        }

        return res.status(error.statusCode).json(response);
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        const apiError = ApiError.authenticationError('Invalid token');
        apiError.setRequestContext(req);
        return res.status(401).json(apiError.toResponse());
    }

    if (error.name === 'TokenExpiredError') {
        const apiError = ApiError.authenticationError('Token expired');
        apiError.setRequestContext(req);
        return res.status(401).json(apiError.toResponse());
    }

    // Handle MongoDB errors
    if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message,
            value: err.value
        }));
        
        const apiError = ApiError.validationError(validationErrors);
        apiError.setRequestContext(req);
        return res.status(400).json(apiError.toResponse());
    }

    if (error.name === 'CastError') {
        const apiError = ApiError.notFoundError('Invalid ID format');
        apiError.setRequestContext(req);
        return res.status(400).json(apiError.toResponse());
    }

    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        const apiError = ApiError.conflictError(`${field} already exists`);
        apiError.setRequestContext(req);
        return res.status(409).json(apiError.toResponse());
    }

    // Handle rate limiting errors
    if (error.status === 429) {
        const apiError = ApiError.rateLimitError('Too many requests');
        apiError.setRequestContext(req);
        return res.status(429).json(apiError.toResponse());
    }

    // Handle validation errors from Joi
    if (error.isJoi) {
        const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
        }));
        
        const apiError = ApiError.validationError(validationErrors);
        apiError.setRequestContext(req);
        return res.status(400).json(apiError.toResponse());
    }

    // Handle generic errors
    const statusCode = error.statusCode || 500;
    const message = isDevelopment ? error.message : 'Internal server error';
    
    const genericError = new ApiError(statusCode, message, [], false);
    genericError.setRequestContext(req);
    
    return res.status(statusCode).json(genericError.toResponse());
};

/**
 * Async error handler wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 404 handler for unmatched routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
    const apiError = ApiError.notFoundError(`Route ${req.originalUrl} not found`);
    apiError.setRequestContext(req);
    res.status(404).json(apiError.toResponse());
};

module.exports = {
    errorHandler,
    asyncHandler,
    notFoundHandler
};
class ApiError extends Error {
    constructor(
        statusCode = 500,
        message = "Something went wrong",
        errors = [],
        isOperational = true
    ) {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors
        this.isOperational = isOperational
        this.timestamp = new Date().toISOString()
        this.path = null
        this.userId = null
        this.requestId = null

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor)
    }

    /**
     * Create validation error
     * @param {Array} validationErrors - Array of validation errors
     * @returns {ApiError} Validation error instance
     */
    static validationError(validationErrors) {
        return new ApiError(400, "Validation failed", validationErrors, true)
    }

    /**
     * Create authentication error
     * @param {string} message - Error message
     * @returns {ApiError} Authentication error instance
     */
    static authenticationError(message = "Authentication failed") {
        return new ApiError(401, message, [], true)
    }

    /**
     * Create authorization error
     * @param {string} message - Error message
     * @returns {ApiError} Authorization error instance
     */
    static authorizationError(message = "Access denied") {
        return new ApiError(403, message, [], true)
    }

    /**
     * Create not found error
     * @param {string} message - Error message
     * @returns {ApiError} Not found error instance
     */
    static notFoundError(message = "Resource not found") {
        return new ApiError(404, message, [], true)
    }

    /**
     * Create conflict error
     * @param {string} message - Error message
     * @returns {ApiError} Conflict error instance
     */
    static conflictError(message = "Resource conflict") {
        return new ApiError(409, message, [], true)
    }

    /**
     * Create rate limit error
     * @param {string} message - Error message
     * @returns {ApiError} Rate limit error instance
     */
    static rateLimitError(message = "Too many requests") {
        return new ApiError(429, message, [], true)
    }

    /**
     * Create internal server error
     * @param {string} message - Error message
     * @returns {ApiError} Internal server error instance
     */
    static internalError(message = "Internal server error") {
        return new ApiError(500, message, [], false)
    }

    /**
     * Create database error
     * @param {string} message - Error message
     * @returns {ApiError} Database error instance
     */
    static databaseError(message = "Database operation failed") {
        return new ApiError(500, message, [], false)
    }

    /**
     * Set request context
     * @param {Object} req - Express request object
     * @returns {ApiError} This error instance
     */
    setRequestContext(req) {
        this.path = req.path
        this.userId = req.body?.user?._id || req.user?._id
        this.requestId = req.headers['x-request-id'] || req.id
        return this
    }

    /**
     * Get error response object
     * @returns {Object} Formatted error response
     */
    toResponse() {
        return {
            success: false,
            isError: true,
            message: this.message,
            statusCode: this.statusCode,
            errors: this.errors,
            timestamp: this.timestamp,
            path: this.path,
            requestId: this.requestId
        }
    }
}

module.exports = ApiError
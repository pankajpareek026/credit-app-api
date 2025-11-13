const { default: mongoose } = require("mongoose");
const ApiError = require("../utils/apiError.utils");

/**
 * Generic request validation middleware
 * @param {Object} schema - Validation schema object
 * @param {string} source - Source of data ('body', 'query', 'params', 'headers')
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            const data = req[source];
            
            // Preserve user object if validating body (added by auth middleware)
            const preservedUser = source === 'body' ? req.body?.user : null;
            
            const { error, value } = schema.validate(data, {
                abortEarly: false,
                stripUnknown: true,
                allowUnknown: false
            });

            if (error) {
                const validationErrors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context?.value
                }));

                return next(new ApiError(400, "Validation failed", validationErrors));
            }

            // Replace the request data with validated data
            req[source] = value;
            
            // Restore preserved user object if validating body
            if (source === 'body' && preservedUser) {
                req.body.user = preservedUser;
            }
            
            next();
        } catch (error) {
            return next(new ApiError(500, "Validation middleware error"));
        }
    };
};

/**
 * Input sanitization middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const sanitizeInput = (req, res, next) => {
    try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query);
        }

        // Sanitize URL parameters
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeObject(req.params);
        }

        next();
    } catch (error) {
        return next(new ApiError(500, "Sanitization error"));
    }
};

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj) => {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            // Remove HTML tags and encode special characters
            sanitized[key] = value
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/[<>]/g, '') // Remove < and >
                .trim(); // Remove leading/trailing whitespace
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
};

/**
 * MongoDB ObjectId validation
 * @param {string} id - ObjectId to validate
 * @returns {boolean} True if valid ObjectId
 */
const validateObjectId = (id) => {
    if (!id) return false;
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate ObjectId middleware
 * @param {string} paramName - Parameter name containing ObjectId
 * @returns {Function} Express middleware function
 */
const validateObjectIdParam = (paramName) => {
    return (req, res, next) => {
        const id = req.params[paramName] || req.body[paramName] || req.query[paramName];
        
        if (!id) {
            return next(new ApiError(400, `${paramName} is required`));
        }
        
        if (!validateObjectId(id)) {
            return next(new ApiError(400, `Invalid ${paramName} format`));
        }
        
        next();
    };
};

/**
 * Pagination validation middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validatePagination = (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        
        // Validate page
        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            return next(new ApiError(400, "Page must be a positive integer"));
        }
        
        // Validate limit
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return next(new ApiError(400, "Limit must be between 1 and 100"));
        }
        
        // Set validated values
        req.query.page = pageNum;
        req.query.limit = limitNum;
        
        next();
    } catch (error) {
        return next(new ApiError(500, "Pagination validation error"));
    }
};

/**
 * Date range validation middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateDateRange = (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (startDate) {
            const start = new Date(startDate);
            if (isNaN(start.getTime())) {
                return next(new ApiError(400, "Invalid start date format"));
            }
            req.query.startDate = start;
        }
        
        if (endDate) {
            const end = new Date(endDate);
            if (isNaN(end.getTime())) {
                return next(new ApiError(400, "Invalid end date format"));
            }
            req.query.endDate = end;
        }
        
        // Validate date range
        if (startDate && endDate && req.query.startDate >= req.query.endDate) {
            return next(new ApiError(400, "Start date must be before end date"));
        }
        
        next();
    } catch (error) {
        return next(new ApiError(500, "Date range validation error"));
    }
};

/**
 * Search query validation middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateSearchQuery = (req, res, next) => {
    try {
        const { search, query } = req.query;
        const searchTerm = search || query;
        
        if (searchTerm) {
            // Validate search term length
            if (typeof searchTerm !== 'string' || searchTerm.length < 2) {
                return next(new ApiError(400, "Search term must be at least 2 characters"));
            }
            
            if (searchTerm.length > 100) {
                return next(new ApiError(400, "Search term too long (max 100 characters)"));
            }
            
            // Sanitize search term
            const sanitized = searchTerm
                .replace(/[<>]/g, '')
                .trim();
            
            if (sanitized.length < 2) {
                return next(new ApiError(400, "Search term too short after sanitization"));
            }
            
            req.query.search = sanitized;
        }
        
        next();
    } catch (error) {
        return next(new ApiError(500, "Search validation error"));
    }
};

/**
 * Request size validation middleware
 * @param {number} maxSize - Maximum request size in bytes
 * @returns {Function} Express middleware function
 */
const validateRequestSize = (maxSize = 10 * 1024 * 1024) => { // 10MB default
    return (req, res, next) => {
        const contentLength = parseInt(req.get('Content-Length') || '0');
        
        if (contentLength > maxSize) {
            return next(new ApiError(413, `Request too large. Maximum size is ${maxSize / (1024 * 1024)}MB`));
        }
        
        next();
    };
};

/**
 * Content-Type validation middleware
 * @param {string} expectedType - Expected content type
 * @returns {Function} Express middleware function
 */
const validateContentType = (expectedType = 'application/json') => {
    return (req, res, next) => {
        const contentType = req.get('Content-Type');
        
        if (!contentType || !contentType.includes(expectedType)) {
            return next(new ApiError(415, `Unsupported media type. Expected ${expectedType}`));
        }
        
        next();
    };
};

/**
 * Required fields validation middleware
 * @param {Array} requiredFields - Array of required field names
 * @param {string} source - Source of data ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const validateRequiredFields = (requiredFields, source = 'body') => {
    return (req, res, next) => {
        const data = req[source];
        const missingFields = [];
        
        for (const field of requiredFields) {
            if (!data || data[field] === undefined || data[field] === null || data[field] === '') {
                missingFields.push(field);
            }
        }
        
        if (missingFields.length > 0) {
            return next(new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`));
        }
        
        next();
    };
};

/**
 * Field length validation middleware
 * @param {Object} fieldRules - Object with field names and their max lengths
 * @param {string} source - Source of data ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const validateFieldLengths = (fieldRules, source = 'body') => {
    return (req, res, next) => {
        const data = req[source];
        const errors = [];
        
        for (const [field, maxLength] of Object.entries(fieldRules)) {
            if (data && data[field] && typeof data[field] === 'string') {
                if (data[field].length > maxLength) {
                    errors.push(`${field} must not exceed ${maxLength} characters`);
                }
            }
        }
        
        if (errors.length > 0) {
            return next(new ApiError(400, errors.join(', ')));
        }
        
        next();
    };
};

/**
 * Enum validation middleware
 * @param {string} field - Field name to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} source - Source of data ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const validateEnum = (field, allowedValues, source = 'body') => {
    return (req, res, next) => {
        const data = req[source];
        
        if (data && data[field] !== undefined) {
            if (!allowedValues.includes(data[field])) {
                return next(new ApiError(400, `${field} must be one of: ${allowedValues.join(', ')}`));
            }
        }
        
        next();
    };
};

/**
 * Number range validation middleware
 * @param {string} field - Field name to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} source - Source of data ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const validateNumberRange = (field, min, max, source = 'body') => {
    return (req, res, next) => {
        const data = req[source];
        
        if (data && data[field] !== undefined) {
            const num = parseFloat(data[field]);
            
            if (isNaN(num)) {
                return next(new ApiError(400, `${field} must be a valid number`));
            }
            
            if (num < min || num > max) {
                return next(new ApiError(400, `${field} must be between ${min} and ${max}`));
            }
        }
        
        next();
    };
};

module.exports = {
    validateRequest,
    sanitizeInput,
    validateObjectId,
    validateObjectIdParam,
    validatePagination,
    validateDateRange,
    validateSearchQuery,
    validateRequestSize,
    validateContentType,
    validateRequiredFields,
    validateFieldLengths,
    validateEnum,
    validateNumberRange
}; 
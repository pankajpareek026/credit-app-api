/**
 * Validation Utility Functions
 * Centralized validation logic for consistent use across the application
 */

/**
 * Email validation function
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

/**
 * Phone number validation function
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone number
 */
const isValidPhoneNumber = (phone) => {
    if (!phone || typeof phone !== 'string') return false;

    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // Check if it starts with + and has 7-15 digits
    if (cleaned.startsWith('+')) {
        return /^\+[1-9]\d{6,14}$/.test(cleaned);
    }

    // Check if it's a valid number without + (7-15 digits)
    return /^[1-9]\d{6,14}$/.test(cleaned);
};

/**
 * Password strength validation function
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and message
 */
const validatePasswordStrength = (password) => {
    if (!password || typeof password !== 'string') {
        return {
            isValid: false,
            message: 'Password is required'
        };
    }

    if (password.length < 8) {
        return {
            isValid: false,
            message: 'Password must be at least 8 characters long'
        };
    }

    if (password.length > 100) {
        return {
            isValid: false,
            message: 'Password must not exceed 100 characters'
        };
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one uppercase letter'
        };
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one lowercase letter'
        };
    }

    // Check for at least one digit
    if (!/\d/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one number'
        };
    }

    // Check for at least one special character
    if (!/[@$!%*?&]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one special character (@$!%*?&)'
        };
    }

    return {
        isValid: true,
        message: 'Password is strong'
    };
};

/**
 * Amount validation function
 * @param {number|string} amount - Amount to validate
 * @returns {Object} Validation result with isValid, value, and message
 */
const validateAmount = (amount) => {
    if (amount === null || amount === undefined || amount === '') {
        return {
            isValid: false,
            value: null,
            message: 'Amount is required'
        };
    }

    const numAmount = parseFloat(amount);

    if (isNaN(numAmount)) {
        return {
            isValid: false,
            value: null,
            message: 'Amount must be a valid number'
        };
    }

    if (numAmount <= 0) {
        return {
            isValid: false,
            value: null,
            message: 'Amount must be greater than 0'
        };
    }

    if (numAmount > 999999999.99) {
        return {
            isValid: false,
            value: null,
            message: 'Amount is too large (maximum 999,999,999.99)'
        };
    }

    // Round to 2 decimal places
    const roundedAmount = Math.round(numAmount * 100) / 100;

    return {
        isValid: true,
        value: roundedAmount,
        message: 'Amount is valid'
    };
};

/**
 * Date validation function
 * @param {string|Date} date - Date to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with isValid, value, and message
 */
const validateDate = (date, options = {}) => {
    const {
        allowFuture = false,
        allowPast = true,
        minDate = null,
        maxDate = null,
        required = true
    } = options;

    if (!date && !required) {
        return {
            isValid: true,
            value: null,
            message: 'Date is optional'
        };
    }

    if (!date && required) {
        return {
            isValid: false,
            value: null,
            message: 'Date is required'
        };
    }

    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
        return {
            isValid: false,
            value: null,
            message: 'Invalid date format'
        };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if future dates are allowed
    if (!allowFuture && dateObj >= tomorrow) {
        return {
            isValid: false,
            value: null,
            message: 'Date cannot be in the future'
        };
    }

    // Check if past dates are allowed
    if (!allowPast && dateObj < today) {
        return {
            isValid: false,
            value: null,
            message: 'Date cannot be in the past'
        };
    }

    // Check minimum date
    if (minDate) {
        const minDateObj = new Date(minDate);
        if (dateObj < minDateObj) {
            return {
                isValid: false,
                value: null,
                message: `Date must be after ${minDateObj.toLocaleDateString()}`
            };
        }
    }

    // Check maximum date
    if (maxDate) {
        const maxDateObj = new Date(maxDate);
        if (dateObj > maxDateObj) {
            return {
                isValid: false,
                value: null,
                message: `Date must be before ${maxDateObj.toLocaleDateString()}`
            };
        }
    }

    return {
        isValid: true,
        value: dateObj,
        message: 'Date is valid'
    };
};

/**
 * URL validation function
 * @param {string} url - URL to validate
 * @returns {Object} Validation result with isValid and message
 */
const validateUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return {
            isValid: false,
            message: 'URL is required'
        };
    }

    try {
        const urlObj = new URL(url);
        const validProtocols = ['http:', 'https:'];

        if (!validProtocols.includes(urlObj.protocol)) {
            return {
                isValid: false,
                message: 'URL must use HTTP or HTTPS protocol'
            };
        }

        if (!urlObj.hostname) {
            return {
                isValid: false,
                message: 'URL must have a valid hostname'
            };
        }

        return {
            isValid: true,
            message: 'URL is valid'
        };
    } catch (error) {
        return {
            isValid: false,
            message: 'Invalid URL format'
        };
    }
};

/**
 * Currency validation function
 * @param {string} currency - Currency code to validate
 * @returns {Object} Validation result with isValid and message
 */
const validateCurrency = (currency) => {
    if (!currency || typeof currency !== 'string') {
        return {
            isValid: false,
            message: 'Currency code is required'
        };
    }

    const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK'];

    if (!validCurrencies.includes(currency.toUpperCase())) {
        return {
            isValid: false,
            message: `Currency must be one of: ${validCurrencies.join(', ')}`
        };
    }

    return {
        isValid: true,
        message: 'Currency is valid'
    };
};

/**
 * String length validation function
 * @param {string} str - String to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {Object} Validation result with isValid and message
 */
const validateStringLength = (str, minLength = 0, maxLength = Infinity) => {
    if (str === null || str === undefined) {
        return {
            isValid: false,
            message: 'String is required'
        };
    }

    if (typeof str !== 'string') {
        return {
            isValid: false,
            message: 'Value must be a string'
        };
    }

    const trimmedLength = str.trim().length;

    if (trimmedLength < minLength) {
        return {
            isValid: false,
            message: `String must be at least ${minLength} characters long`
        };
    }

    if (trimmedLength > maxLength) {
        return {
            isValid: false,
            message: `String must not exceed ${maxLength} characters`
        };
    }

    return {
        isValid: true,
        message: 'String length is valid'
    };
};

/**
 * Number range validation function
 * @param {number|string} num - Number to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {Object} Validation result with isValid, value, and message
 */
const validateNumberRange = (num, min = -Infinity, max = Infinity) => {
    if (num === null || num === undefined || num === '') {
        return {
            isValid: false,
            value: null,
            message: 'Number is required'
        };
    }

    const number = parseFloat(num);

    if (isNaN(number)) {
        return {
            isValid: false,
            value: null,
            message: 'Value must be a valid number'
        };
    }

    if (number < min) {
        return {
            isValid: false,
            value: null,
            message: `Number must be at least ${min}`
        };
    }

    if (number > max) {
        return {
            isValid: false,
            value: null,
            message: `Number must not exceed ${max}`
        };
    }

    return {
        isValid: true,
        value: number,
        message: 'Number is valid'
    };
};

/**
 * Enum validation function
 * @param {string} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @returns {Object} Validation result with isValid and message
 */
const validateEnum = (value, allowedValues) => {
    if (!allowedValues || !Array.isArray(allowedValues)) {
        return {
            isValid: false,
            message: 'Invalid validation configuration'
        };
    }

    if (value === null || value === undefined) {
        return {
            isValid: false,
            message: 'Value is required'
        };
    }

    if (!allowedValues.includes(value)) {
        return {
            isValid: false,
            message: `Value must be one of: ${allowedValues.join(', ')}`
        };
    }

    return {
        isValid: true,
        message: 'Value is valid'
    };
};

/**
 * Array validation function
 * @param {Array} arr - Array to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {Object} Validation result with isValid and message
 */
const validateArray = (arr, minLength = 0, maxLength = Infinity) => {
    if (!Array.isArray(arr)) {
        return {
            isValid: false,
            message: 'Value must be an array'
        };
    }

    if (arr.length < minLength) {
        return {
            isValid: false,
            message: `Array must have at least ${minLength} items`
        };
    }

    if (arr.length > maxLength) {
        return {
            isValid: false,
            message: `Array must not exceed ${maxLength} items`
        };
    }

    return {
        isValid: true,
        message: 'Array is valid'
    };
};

/**
 * Boolean validation function
 * @param {any} value - Value to validate as boolean
 * @returns {Object} Validation result with isValid, value, and message
 */
const validateBoolean = (value) => {
    if (value === null || value === undefined) {
        return {
            isValid: false,
            value: null,
            message: 'Boolean value is required'
        };
    }

    if (typeof value === 'boolean') {
        return {
            isValid: true,
            value: value,
            message: 'Boolean is valid'
        };
    }

    if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true' || lowerValue === 'false') {
            return {
                isValid: true,
                value: lowerValue === 'true',
                message: 'Boolean is valid'
            };
        }
    }

    if (typeof value === 'number') {
        if (value === 0 || value === 1) {
            return {
                isValid: true,
                value: value === 1,
                message: 'Boolean is valid'
            };
        }
    }

    return {
        isValid: false,
        value: null,
        message: 'Value must be a valid boolean'
    };
};

/**
 * Sanitize string function
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (str) => {
    if (!str || typeof str !== 'string') return '';

    return str
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/&/g, '&amp;') // Encode &
        .replace(/"/g, '&quot;') // Encode "
        .replace(/'/g, '&#x27;') // Encode '
        .replace(/\//g, '&#x2F;') // Encode /
        .trim(); // Remove leading/trailing whitespace
};

/**
 * Format currency function
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'INR') => {
    if (!amount || isNaN(amount)) return '₹0.00';

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

/**
 * Format date function
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string
 * @returns {string} Formatted date string
 */
const formatDate = (date, format = 'YYYY-MM-DD') => {
    if (!date) return '';

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day);
};

/**
 * Generate validation error message
 * @param {string} field - Field name
 * @param {string} rule - Validation rule
 * @param {any} value - Field value
 * @returns {string} Formatted error message
 */
const generateValidationMessage = (field, rule, value = null) => {
    const fieldName = field.charAt(0).toUpperCase() + field.slice(1);

    switch (rule) {
        case 'required':
            return `${fieldName} is required`;
        case 'email':
            return 'Please enter a valid email address';
        case 'phone':
            return 'Please enter a valid phone number';
        case 'password':
            return 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
        case 'amount':
            return 'Please enter a valid amount';
        case 'date':
            return 'Please enter a valid date';
        case 'url':
            return 'Please enter a valid URL';
        case 'length':
            return `${fieldName} length is invalid`;
        case 'range':
            return `${fieldName} is out of valid range`;
        case 'enum':
            return `${fieldName} must be one of the allowed values`;
        case 'array':
            return `${fieldName} must be an array`;
        case 'boolean':
            return `${fieldName} must be true or false`;
        default:
            return `${fieldName} is invalid`;
    }
};

module.exports = {
    isValidEmail,
    isValidPhoneNumber,
    validatePasswordStrength,
    validateAmount,
    validateDate,
    validateUrl,
    validateCurrency,
    validateStringLength,
    validateNumberRange,
    validateEnum,
    validateArray,
    validateBoolean,
    sanitizeString,
    formatCurrency,
    formatDate,
    generateValidationMessage
}; 
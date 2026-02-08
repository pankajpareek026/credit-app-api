const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs: windowMs,
        max: max,
        message: {
            success: false,
            message: message || 'Too many requests from this IP, please try again later.',
            statusCode: 429
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// General API rate limiter
const apiLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    3000, // limit each IP to 3000 requests per windowMs (relaxed for dev)
    'Too many API requests from this IP, please try again later.'
);

// Auth endpoints rate limiter
const authLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs (relaxed for dev)
    'Too many authentication attempts from this IP, please try again later.'
);

// Notes/Vault endpoints rate limiter
const sensitiveDataLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    500, // limit each IP to 500 requests per windowMs (relaxed for dev)
    'Too many requests to sensitive data endpoints, please try again later.'
);

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:8080',
            'http://localhost:2205',
            'http://10.237.249.119:2205',
            'https://yourdomain.com', // Add your production domain
            'https://www.yourdomain.com'
        ];

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
};

// Security headers configuration
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Input validation middleware
const validateInput = (req, res, next) => {
    // Sanitize request body
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        });
    }

    // Sanitize query parameters
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key].trim();
            }
        });
    }

    next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            userId: req.body?.user?._id || 'anonymous'
        };

        // Log based on status code
        if (res.statusCode >= 400) {
            console.error('API Error:', logData);
        } else {
            console.log('API Request:', logData);
        }
    });

    next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
    const errorLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        error: {
            message: err.message,
            stack: err.stack,
            name: err.name
        },
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        userId: req.body?.user?._id || 'anonymous'
    };

    console.error('API Error:', errorLog);
    next(err);
};

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
        return res.status(413).json({
            success: false,
            message: 'Request entity too large',
            statusCode: 413
        });
    }

    next();
};

// API key validation middleware (for future use)
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    // For now, we'll skip API key validation
    // In production, implement proper API key validation
    if (false && !apiKey) {
        return res.status(401).json({
            success: false,
            message: 'API key is required',
            statusCode: 401
        });
    }

    next();
};

// Session validation middleware
const validateSession = (req, res, next) => {
    // This middleware can be used to validate session tokens
    // For now, we'll skip session validation as we're using JWT
    next();
};

// Apply security middleware
const applySecurityMiddleware = (app) => {
    // Basic security headers
    app.use(securityHeaders);

    // CORS
    app.use(cors(corsOptions));

    // Request parsing limits
    app.use(requestSizeLimiter);

    // Input sanitization
    app.use(mongoSanitize()); // Prevent NoSQL injection
    app.use(xss()); // Prevent XSS attacks
    app.use(hpp()); // Prevent HTTP Parameter Pollution

    // Input validation
    app.use(validateInput);

    // Request logging
    app.use(requestLogger);

    // Error logging
    app.use(errorLogger);

    // API key validation (optional)
    app.use(validateApiKey);

    // Session validation (optional)
    app.use(validateSession);

    // Apply rate limiting to specific routes
    app.use('/api/auth', authLimiter);
    app.use('/api/notes', sensitiveDataLimiter);
    app.use('/api/vault', sensitiveDataLimiter);
    app.use('/api', apiLimiter);
};

module.exports = {
    applySecurityMiddleware,
    apiLimiter,
    authLimiter,
    sensitiveDataLimiter,
    corsOptions,
    securityHeaders,
    validateInput,
    requestLogger,
    errorLogger,
    requestSizeLimiter,
    validateApiKey,
    validateSession
}; 
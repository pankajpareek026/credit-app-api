const winston = require('winston'); // Import winston for logging

// Create a logger instance
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'combined.log' })
    ],
});
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`Request to ${req.method} ${req.originalUrl} took ${duration}ms`); // Log request duration
    });
    next();
};

module.exports = { logger, requestLogger };
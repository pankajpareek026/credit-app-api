const mongoose = require('mongoose');

/**
 * Login Record Schema - Tracks user login activities for security and analytics
 * 
 * This model stores comprehensive login information including:
 * - User identification and session details
 * - Device and location information
 * - Security-related data (IP, user agent, etc.)
 * - Timestamps for audit trails
 * - Login status and failure reasons
 */
const loginRecordSchema = new mongoose.Schema({
    // User identification
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true // For efficient queries
    },

    // Session information
    sessionId: {
        type: String,
        required: true,
        unique: true // Each login gets a unique session
    },

    // Login details
    loginTime: {
        type: Date,
        required: true,
        default: Date.now,
        index: true // For time-based queries
    },

    logoutTime: {
        type: Date,
        default: null // Set when user logs out
    },

    // Session duration in milliseconds
    sessionDuration: {
        type: Number,
        default: null
    },

    // Login status and type
    loginStatus: {
        type: String,
        enum: ['success', 'failed', 'expired', 'forced_logout'],
        required: true,
        default: 'success'
    },

    // Failure reason (if login failed)
    failureReason: {
        type: String,
        enum: ['invalid_credentials', 'account_locked', 'too_many_attempts', 'network_error', 'server_error', 'other'],
        default: null
    },

    // Device and client information
    userAgent: {
        type: String,
        required: true
    },

    deviceType: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'unknown'],
        default: 'unknown'
    },

    platform: {
        type: String,
        enum: ['android', 'ios', 'web', 'windows', 'macos', 'linux', 'unknown'],
        default: 'unknown'
    },

    // Network and location information
    ipAddress: {
        type: String,
        required: true
    },

    location: {
        country: String,
        region: String,
        city: String,
        timezone: String
    },

    // Security-related information
    isSuspicious: {
        type: Boolean,
        default: false
    },

    suspiciousFlags: [{
        type: String,
        enum: ['unusual_location', 'unusual_device', 'unusual_time', 'multiple_failures', 'rapid_requests']
    }],

    // Application-specific data
    appVersion: {
        type: String,
        default: '1.0.0'
    },

    apiVersion: {
        type: String,
        default: 'v1'
    },

    // Additional metadata
    metadata: {
        type: Map,
        of: String,
        default: {}
    }
}, {
    // Enable timestamps for audit trails
    timestamps: true,

    // Optimize for queries
    indexes: [
        { userId: 1, loginTime: -1 }, // For user's login history
        { loginStatus: 1, loginTime: -1 }, // For failed login analysis
        { ipAddress: 1, loginTime: -1 }, // For IP-based analysis
        { sessionId: 1 }, // For session lookups
        { createdAt: -1 } // For general time-based queries
    ]
});

/**
 * Pre-save middleware to calculate session duration
 */
loginRecordSchema.pre('save', function (next) {
    // Calculate session duration if logout time is set
    if (this.logoutTime && this.loginTime) {
        this.sessionDuration = this.logoutTime.getTime() - this.loginTime.getTime();
    }
    next();
});

/**
 * Static method to create a new login record
 * @param {Object} loginData - Login information
 * @returns {Promise<Object>} Created login record
 */
loginRecordSchema.statics.createLoginRecord = async function (loginData) {
    try {
        const record = new this(loginData);
        await record.save();
        return record;
    } catch (error) {
        console.error('Error creating login record:', error);
        throw error;
    }
};

/**
 * Static method to update logout time
 * @param {String} sessionId - Session ID to update
 * @param {Date} logoutTime - Logout timestamp
 * @returns {Promise<Object>} Updated record
 */
loginRecordSchema.statics.updateLogoutTime = async function (sessionId, logoutTime) {
    try {
        const record = await this.findOneAndUpdate(
            { sessionId },
            {
                logoutTime,
                sessionDuration: logoutTime.getTime() - this.loginTime.getTime()
            },
            { new: true }
        );
        return record;
    } catch (error) {
        console.error('Error updating logout time:', error);
        throw error;
    }
};

/**
 * Static method to get user's login history
 * @param {String} userId - User ID
 * @param {Number} limit - Number of records to return
 * @param {Number} skip - Number of records to skip
 * @returns {Promise<Array>} Login history
 */
loginRecordSchema.statics.getUserLoginHistory = async function (userId, limit = 10, skip = 0) {
    try {
        const records = await this.find({ userId })
            .sort({ loginTime: -1 })
            .limit(limit)
            .skip(skip)
            .select('-__v'); // Exclude version key

        return records;
    } catch (error) {
        console.error('Error fetching login history:', error);
        throw error;
    }
};

/**
 * Static method to get suspicious login attempts
 * @param {String} userId - User ID
 * @param {Number} days - Number of days to look back
 * @returns {Promise<Array>} Suspicious login attempts
 */
loginRecordSchema.statics.getSuspiciousLogins = async function (userId, days = 30) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const records = await this.find({
            userId,
            loginTime: { $gte: cutoffDate },
            $or: [
                { isSuspicious: true },
                { loginStatus: 'failed' },
                { 'suspiciousFlags.0': { $exists: true } }
            ]
        }).sort({ loginTime: -1 });

        return records;
    } catch (error) {
        console.error('Error fetching suspicious logins:', error);
        throw error;
    }
};

/**
 * Instance method to mark session as logged out
 * @param {Date} logoutTime - Logout timestamp
 */
loginRecordSchema.methods.markLoggedOut = async function (logoutTime) {
    this.logoutTime = logoutTime;
    this.sessionDuration = logoutTime.getTime() - this.loginTime.getTime();
    await this.save();
};

/**
 * Instance method to mark as suspicious
 * @param {Array} flags - Suspicious activity flags
 */
loginRecordSchema.methods.markSuspicious = async function (flags) {
    this.isSuspicious = true;
    this.suspiciousFlags = flags;
    await this.save();
};

module.exports = mongoose.model('loginRecord', loginRecordSchema); 
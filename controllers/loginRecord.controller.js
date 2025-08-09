const loginRecord = require("../Models/loginRecord.modal");
const ApiError = require("../utils/apiError.utils");
const ApiResponse = require("../utils/apiResponse.utils");
const { v4: uuidv4 } = require('uuid'); // For generating unique session IDs

/**
 * Utility function to detect device type from user agent
 * @param {string} userAgent - User agent string
 * @returns {string} Device type
 */
const detectDeviceType = (userAgent) => {
  const ua = userAgent.toLowerCase();
  
  // Mobile detection
  if (/android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
    if (/ipad/i.test(ua)) return 'tablet';
    return 'mobile';
  }
  
  // Desktop detection
  if (/windows|macintosh|linux/i.test(ua)) {
    return 'desktop';
  }
  
  return 'unknown';
};

/**
 * Utility function to detect platform from user agent
 * @param {string} userAgent - User agent string
 * @returns {string} Platform
 */
const detectPlatform = (userAgent) => {
  const ua = userAgent.toLowerCase();
  
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/windows/i.test(ua)) return 'windows';
  if (/macintosh/i.test(ua)) return 'macos';
  if (/linux/i.test(ua)) return 'linux';
  if (/chrome|firefox|safari|edge/i.test(ua)) return 'web';
  
  return 'unknown';
};

/**
 * Utility function to get client IP address
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
const getClientIP = (req) => {
  // Check for forwarded headers (for proxy/load balancer scenarios)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Check for real IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }
  
  // Fallback to connection remote address
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
};

/**
 * Create a new login record
 * POST /api/login-records
 */
const createLoginRecord = async (req, res, next) => {
  try {
    // Extract user information from request
    const userId = req.body.user?._id || req.body.userId;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = getClientIP(req);
    
    // Validate required fields
    if (!userId) {
      return next(ApiError.badRequest('User ID is required'));
    }
    
    // Generate unique session ID
    const sessionId = uuidv4();
    
    // Detect device and platform information
    const deviceType = detectDeviceType(userAgent);
    const platform = detectPlatform(userAgent);
    
    // Create login record data
    const loginData = {
      userId,
      sessionId,
      loginTime: new Date(),
      loginStatus: 'success',
      userAgent,
      deviceType,
      platform,
      ipAddress,
      appVersion: req.headers['app-version'] || '1.0.0',
      apiVersion: 'v1',
      metadata: {
        requestId: req.headers['x-request-id'] || '',
        referer: req.headers.referer || '',
        acceptLanguage: req.headers['accept-language'] || ''
      }
    };
    
    // Create the login record
    const record = await loginRecord.createLoginRecord(loginData);
    
    // Return success response with session ID
    return res.status(201).json(
      ApiResponse.created(
        { 
          sessionId: record.sessionId,
          loginTime: record.loginTime,
          deviceType: record.deviceType,
          platform: record.platform
        },
        'Login record created successfully'
      )
    );
    
  } catch (error) {
    console.error('Error creating login record:', error);
    return next(ApiError.internalError('Failed to create login record'));
  }
};

/**
 * Update logout time for a session
 * PUT /api/login-records/:sessionId/logout
 */
const updateLogoutTime = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const logoutTime = new Date();
    
    // Validate session ID
    if (!sessionId) {
      return next(ApiError.badRequest('Session ID is required'));
    }
    
    // Find and update the login record
    const record = await loginRecord.updateLogoutTime(sessionId, logoutTime);
    
    if (!record) {
      return next(ApiError.notFound('Login record not found'));
    }
    
    // Calculate session duration
    const sessionDuration = logoutTime.getTime() - record.loginTime.getTime();
    
    return res.status(200).json(
      ApiResponse.success(
        {
          sessionId: record.sessionId,
          logoutTime: record.logoutTime,
          sessionDuration: sessionDuration,
          durationFormatted: formatDuration(sessionDuration)
        },
        'Logout time updated successfully'
      )
    );
    
  } catch (error) {
    console.error('Error updating logout time:', error);
    return next(ApiError.internalError('Failed to update logout time'));
  }
};

/**
 * Get user's login history
 * GET /api/login-records/user/:userId
 */
const getUserLoginHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 10, skip = 0, status } = req.query;
    
    // Validate user ID
    if (!userId) {
      return next(ApiError.badRequest('User ID is required'));
    }
    
    // Build query
    const query = { userId };
    if (status) {
      query.loginStatus = status;
    }
    
    // Get login records with pagination
    const records = await loginRecord.find(query)
      .sort({ loginTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-__v');
    
    // Get total count for pagination
    const totalCount = await loginRecord.countDocuments(query);
    
    // Format records for response
    const formattedRecords = records.map(record => ({
      id: record._id,
      sessionId: record.sessionId,
      loginTime: record.loginTime,
      logoutTime: record.logoutTime,
      sessionDuration: record.sessionDuration,
      durationFormatted: record.sessionDuration ? formatDuration(record.sessionDuration) : null,
      loginStatus: record.loginStatus,
      deviceType: record.deviceType,
      platform: record.platform,
      ipAddress: record.ipAddress,
      isSuspicious: record.isSuspicious,
      suspiciousFlags: record.suspiciousFlags,
      createdAt: record.createdAt
    }));
    
    return res.status(200).json(
      ApiResponse.success(
        {
          records: formattedRecords,
          pagination: {
            total: totalCount,
            limit: parseInt(limit),
            skip: parseInt(skip),
            hasMore: totalCount > parseInt(skip) + formattedRecords.length
          }
        },
        'Login history retrieved successfully'
      )
    );
    
  } catch (error) {
    console.error('Error fetching login history:', error);
    return next(ApiError.internalError('Failed to fetch login history'));
  }
};

/**
 * Get suspicious login attempts for a user
 * GET /api/login-records/user/:userId/suspicious
 */
const getSuspiciousLogins = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    // Validate user ID
    if (!userId) {
      return next(ApiError.badRequest('User ID is required'));
    }
    
    // Get suspicious login records
    const records = await loginRecord.getSuspiciousLogins(userId, parseInt(days));
    
    // Format records for response
    const formattedRecords = records.map(record => ({
      id: record._id,
      sessionId: record.sessionId,
      loginTime: record.loginTime,
      loginStatus: record.loginStatus,
      failureReason: record.failureReason,
      deviceType: record.deviceType,
      platform: record.platform,
      ipAddress: record.ipAddress,
      isSuspicious: record.isSuspicious,
      suspiciousFlags: record.suspiciousFlags,
      userAgent: record.userAgent,
      createdAt: record.createdAt
    }));
    
    return res.status(200).json(
      ApiResponse.success(
        {
          records: formattedRecords,
          summary: {
            total: records.length,
            suspicious: records.filter(r => r.isSuspicious).length,
            failed: records.filter(r => r.loginStatus === 'failed').length,
            daysAnalyzed: parseInt(days)
          }
        },
        'Suspicious login attempts retrieved successfully'
      )
    );
    
  } catch (error) {
    console.error('Error fetching suspicious logins:', error);
    return next(ApiError.internalError('Failed to fetch suspicious logins'));
  }
};

/**
 * Mark a login record as suspicious
 * PUT /api/login-records/:sessionId/suspicious
 */
const markAsSuspicious = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { flags, reason } = req.body;
    
    // Validate session ID
    if (!sessionId) {
      return next(ApiError.badRequest('Session ID is required'));
    }
    
    // Find the login record
    const record = await loginRecord.findOne({ sessionId });
    
    if (!record) {
      return next(ApiError.notFound('Login record not found'));
    }
    
    // Mark as suspicious
    await record.markSuspicious(flags || []);
    
    return res.status(200).json(
      ApiResponse.success(
        {
          sessionId: record.sessionId,
          isSuspicious: record.isSuspicious,
          suspiciousFlags: record.suspiciousFlags
        },
        'Login record marked as suspicious'
      )
    );
    
  } catch (error) {
    console.error('Error marking login as suspicious:', error);
    return next(ApiError.internalError('Failed to mark login as suspicious'));
  }
};

/**
 * Get login statistics for a user
 * GET /api/login-records/user/:userId/stats
 */
const getUserLoginStats = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    // Validate user ID
    if (!userId) {
      return next(ApiError.badRequest('User ID is required'));
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    
    // Get aggregated statistics
    const stats = await loginRecord.aggregate([
      {
        $match: {
          userId: require('mongoose').Types.ObjectId(userId),
          loginTime: { $gte: cutoffDate }
        }
      },
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
            $sum: { $cond: ['$isSuspicious', 1, 0] }
          },
          totalSessionDuration: {
            $sum: { $cond: [{ $ne: ['$sessionDuration', null] }, '$sessionDuration', 0] }
          },
          avgSessionDuration: {
            $avg: { $cond: [{ $ne: ['$sessionDuration', null] }, '$sessionDuration', null] }
          },
          uniqueDevices: { $addToSet: '$deviceType' },
          uniquePlatforms: { $addToSet: '$platform' },
          uniqueIPs: { $addToSet: '$ipAddress' }
        }
      },
      {
        $project: {
          _id: 0,
          totalLogins: 1,
          successfulLogins: 1,
          failedLogins: 1,
          suspiciousLogins: 1,
          successRate: {
            $multiply: [
              { $divide: ['$successfulLogins', '$totalLogins'] },
              100
            ]
          },
          totalSessionDuration: 1,
          avgSessionDuration: 1,
          uniqueDevices: { $size: '$uniqueDevices' },
          uniquePlatforms: { $size: '$uniquePlatforms' },
          uniqueIPs: { $size: '$uniqueIPs' }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalLogins: 0,
      successfulLogins: 0,
      failedLogins: 0,
      suspiciousLogins: 0,
      successRate: 0,
      totalSessionDuration: 0,
      avgSessionDuration: 0,
      uniqueDevices: 0,
      uniquePlatforms: 0,
      uniqueIPs: 0
    };
    
    return res.status(200).json(
      ApiResponse.success(
        {
          ...result,
          avgSessionDurationFormatted: result.avgSessionDuration ? 
            formatDuration(result.avgSessionDuration) : null,
          totalSessionDurationFormatted: result.totalSessionDuration ? 
            formatDuration(result.totalSessionDuration) : null,
          daysAnalyzed: parseInt(days)
        },
        'Login statistics retrieved successfully'
      )
    );
    
  } catch (error) {
    console.error('Error fetching login stats:', error);
    return next(ApiError.internalError('Failed to fetch login statistics'));
  }
};

/**
 * Utility function to format duration in human-readable format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration
 */
const formatDuration = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

module.exports = {
  createLoginRecord,
  updateLogoutTime,
  getUserLoginHistory,
  getSuspiciousLogins,
  markAsSuspicious,
  getUserLoginStats
}; 
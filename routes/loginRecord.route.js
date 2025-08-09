const express = require('express');
const router = express.Router();

// Import controllers and middleware
const loginRecordController = require('../controllers/loginRecord.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');

/**
 * Login Record Routes
 * 
 * This module provides comprehensive login tracking functionality including:
 * - Creating login records on successful authentication
 * - Updating logout times for session management
 * - Retrieving user login history with pagination
 * - Analyzing suspicious login attempts
 * - Generating login statistics and analytics
 * 
 * All routes require authentication except for creating login records
 * (which happens during the login process itself)
 */

/**
 * POST /api/login-records
 * Create a new login record
 * 
 * This endpoint is typically called during the login process
 * to track successful user authentication attempts.
 * 
 * @body {string} userId - User ID from the authenticated user
 * @headers {string} user-agent - Client user agent string
 * @headers {string} app-version - Application version (optional)
 * @returns {object} Created login record with session ID
 */
router.post('/', 
  authMiddleware, // Require authentication
  loginRecordController.createLoginRecord
);

/**
 * PUT /api/login-records/:sessionId/logout
 * Update logout time for a session
 * 
 * This endpoint is called when a user logs out to record
 * the session duration and mark the session as ended.
 * 
 * @param {string} sessionId - Unique session identifier
 * @returns {object} Updated login record with session duration
 */
router.put('/:sessionId/logout',
  authMiddleware, // Require authentication
  loginRecordController.updateLogoutTime
);

/**
 * GET /api/login-records/user/:userId
 * Get user's login history with pagination
 * 
 * Retrieves paginated list of user's login attempts
 * with comprehensive session information.
 * 
 * @param {string} userId - User ID to get history for
 * @query {number} limit - Number of records to return (default: 10)
 * @query {number} skip - Number of records to skip (default: 0)
 * @query {string} status - Filter by login status (success, failed, etc.)
 * @returns {object} Paginated login history with metadata
 */
router.get('/user/:userId',
  authMiddleware, // Require authentication
  loginRecordController.getUserLoginHistory
);

/**
 * GET /api/login-records/user/:userId/suspicious
 * Get suspicious login attempts for a user
 * 
 * Retrieves login attempts that have been flagged as suspicious
 * or failed, useful for security monitoring.
 * 
 * @param {string} userId - User ID to get suspicious logins for
 * @query {number} days - Number of days to look back (default: 30)
 * @returns {object} Suspicious login attempts with summary statistics
 */
router.get('/user/:userId/suspicious',
  authMiddleware, // Require authentication
  loginRecordController.getSuspiciousLogins
);

/**
 * PUT /api/login-records/:sessionId/suspicious
 * Mark a login record as suspicious
 * 
 * Allows manual flagging of login attempts as suspicious
 * for security monitoring and threat detection.
 * 
 * @param {string} sessionId - Session ID to mark as suspicious
 * @body {array} flags - Array of suspicious activity flags
 * @body {string} reason - Optional reason for marking as suspicious
 * @returns {object} Updated login record with suspicious flags
 */
router.put('/:sessionId/suspicious',
  authMiddleware, // Require authentication
  loginRecordController.markAsSuspicious
);

/**
 * GET /api/login-records/user/:userId/stats
 * Get login statistics for a user
 * 
 * Provides comprehensive analytics about user's login patterns
 * including success rates, session durations, and device usage.
 * 
 * @param {string} userId - User ID to get statistics for
 * @query {number} days - Number of days to analyze (default: 30)
 * @returns {object} Login statistics with formatted durations
 */
router.get('/user/:userId/stats',
  authMiddleware, // Require authentication
  loginRecordController.getUserLoginStats
);

module.exports = router; 
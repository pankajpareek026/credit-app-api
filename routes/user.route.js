const {
    login,
    register,
    logout,
    profile,
    verifyPasswordForPinReset,
    resetPin,
    promoteToAdmin,
    demoteFromAdmin,
    updateFeatureFlags,
    getUserFlags,
    getAllAdminUsers
} = require('../controllers/user.controller');
const {
    requestOtp,
    verifyOtpForLogin,
    verifyOtpForPasswordReset,
    resetPassword
} = require('../controllers/otp.controller');
const authy = require('../middlewares/auth.middleware');
const { featureFlagMiddleware, adminRoleMiddleware } = require('../middlewares/featureFlag.middleware');

const Router = require('express').Router;
const router = Router()
router.route("/login").post(login)
router.route("/register").post(register)
router.route("/logout").post(authy, logout)
router.route("/userProfile").get(authy, profile)

// OTP routes
router.route("/request-otp").post(requestOtp)
router.route("/verify-otp-login").post(verifyOtpForLogin)
router.route("/verify-otp-password-reset").post(verifyOtpForPasswordReset)
router.route("/reset-password").post(resetPassword)

// PIN reset routes
router.route("/verify-password-for-pin-reset").post(verifyPasswordForPinReset)
router.route("/reset-pin").post(resetPin)

// Feature flags for current user
router.route("/feature-flags").get(authy, getUserFlags)

// Admin management routes
router.route("/promote/:userId").post(
    authy,
    adminRoleMiddleware(['admin', 'super_admin']),
    featureFlagMiddleware('canManageUsers'),
    promoteToAdmin
)

router.route("/demote/:userId").post(
    authy,
    adminRoleMiddleware(['admin', 'super_admin']),
    featureFlagMiddleware('canManageUsers'),
    demoteFromAdmin
)

router.route("/feature-flags/:userId").patch(
    authy,
    adminRoleMiddleware(['admin', 'super_admin']),
    featureFlagMiddleware('canManageUsers'),
    updateFeatureFlags
)

router.route("/admin-users").get(
    authy,
    adminRoleMiddleware(['admin', 'super_admin']),
    featureFlagMiddleware('canManageUsers'),
    getAllAdminUsers
)

// Test endpoints
router.route("/test").get((req, res) => {
    res.json({
        isSuccess: true,
        isError: false,
        message: "Backend is running successfully!",
        responseData: {
            timestamp: new Date().toISOString(),
            server: "localhost:2205"
        }
    });
});

// Test transaction endpoint
router.route("/test-transactions").get(authy, (req, res) => {
    res.json({
        isSuccess: true,
        isError: false,
        message: "Transaction endpoint is working!",
        responseData: {
            user: req.body.user,
            timestamp: new Date().toISOString(),
            server: "localhost:2205"
        }
    });
});

// Test database connection
router.route("/test-db").get(async (req, res) => {
    try {
        const user = require('../Models/user.modal');
        const count = await user.countDocuments();
        res.json({
            isSuccess: true,
            isError: false,
            message: "Database connection test",
            responseData: {
                userCount: count,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.json({
            isSuccess: false,
            isError: true,
            message: "Database connection failed",
            error: error.message
        });
    }
});

// Test find user
router.route("/test-find-user").get(async (req, res) => {
    try {
        const user = require('../Models/user.modal');
        const testUser = await user.findOne({ email: 'superadmin@creditapp.com' });
        res.json({
            isSuccess: true,
            isError: false,
            message: "Find user test",
            responseData: {
                userFound: testUser ? 'Yes' : 'No',
                user: testUser ? {
                    id: testUser._id,
                    name: testUser.name,
                    email: testUser.email,
                    isAdmin: testUser.isAdmin,
                    adminRole: testUser.adminRole
                } : null,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.json({
            isSuccess: false,
            isError: true,
            message: "Find user test failed",
            error: error.message
        });
    }
});

// Test list all users
router.route("/test-list-users").get(async (req, res) => {
    try {
        const user = require('../Models/user.modal');
        const users = await user.find({}).limit(5).select('name email isAdmin adminRole');
        res.json({
            isSuccess: true,
            isError: false,
            message: "List users test",
            responseData: {
                users: users,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.json({
            isSuccess: false,
            isError: true,
            message: "List users test failed",
            error: error.message
        });
    }
});

// Test database info
router.route("/test-db-info").get(async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const dbName = mongoose.connection.db.databaseName;
        res.json({
            isSuccess: true,
            isError: false,
            message: "Database info test",
            responseData: {
                databaseName: dbName,
                connectionState: mongoose.connection.readyState,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.json({
            isSuccess: false,
            isError: true,
            message: "Database info test failed",
            error: error.message
        });
    }
});

module.exports = router;
const { login, register, logout, profile } = require('../controllers/user.controller');
const authy = require('../middlewares/auth.middleware');

const Router = require('express').Router;
const router = Router()
router.route("/login").post(login)
router.route("/register").post(register)
router.route("/logout").post(authy, logout)
router.route("/userProfile").get(authy, profile)

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

module.exports = router;
const {
    createBillReminder,
    getAllBillReminders,
    getBillReminder,
    updateBillReminder,
    deleteBillReminder,
    markAsPaid,
    snoozeBillReminder,
    getBillReminderStatistics
} = require('../controllers/billReminder.controller');
const authy = require('../middlewares/auth.middleware');

const Router = require('express').Router;
const router = Router();

// Create new bill reminder
router.route("/create").post(authy, createBillReminder);

// Get all bill reminders with pagination and filtering
router.route("/all").get(authy, getAllBillReminders);

// Get single bill reminder
router.route("/:reminderId").get(authy, getBillReminder);

// Update bill reminder
router.route("/:reminderId").put(authy, updateBillReminder);

// Delete bill reminder (soft delete)
router.route("/:reminderId").delete(authy, deleteBillReminder);

// Mark bill reminder as paid
router.route("/:reminderId/paid").patch(authy, markAsPaid);

// Snooze bill reminder
router.route("/:reminderId/snooze").patch(authy, snoozeBillReminder);

// Get bill reminder statistics
router.route("/statistics").get(authy, getBillReminderStatistics);

module.exports = router; 
const {
    createExpense,
    getAllExpenses,
    getExpense,
    updateExpense,
    deleteExpense,
    getExpenseStatistics,
    bulkCreateExpenses
} = require('../controllers/expense.controller');
const authy = require('../middlewares/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { expenseSchemas } = require('../utils/validationSchemas');

const Router = require('express').Router;
const router = Router();

// Create new expense
router.route("/").post(
    authy,
    validateRequest(expenseSchemas.create),
    createExpense
);

// Get all expenses with pagination and filtering
router.route("/").get(
    authy,
    validateRequest(expenseSchemas.getExpenses, 'query'),
    getAllExpenses
);

// Bulk create expenses
router.route("/bulk").post(
    authy,
    validateRequest(expenseSchemas.bulkCreate),
    bulkCreateExpenses
);

// Get expense statistics
router.route("/statistics").get(
    authy,
    validateRequest(expenseSchemas.getStatistics, 'query'),
    getExpenseStatistics
);

// Get single expense
router.route("/:expenseId").get(
    authy,
    getExpense
);

// Update expense
router.route("/:expenseId").put(
    authy,
    validateRequest(expenseSchemas.update),
    updateExpense
);

// Delete expense (soft delete)
router.route("/:expenseId").delete(
    authy,
    deleteExpense
);

module.exports = router;

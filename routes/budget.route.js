const {
    createBudget,
    getAllBudgets,
    getBudget,
    updateBudget,
    deleteBudget,
    getBudgetStatistics
} = require('../controllers/budget.controller');
const authy = require('../middlewares/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { budgetSchemas } = require('../utils/validationSchemas');

const Router = require('express').Router;
const router = Router();

// Create new budget
router.route("/").post(
    authy,
    validateRequest(budgetSchemas.create),
    createBudget
);

// Get all budgets with pagination and filtering
router.route("/").get(
    authy,
    validateRequest(budgetSchemas.getBudgets, 'query'),
    getAllBudgets
);

// Get budget statistics
router.route("/statistics").get(
    authy,
    validateRequest(budgetSchemas.getStatistics, 'query'),
    getBudgetStatistics
);

// Get single budget
router.route("/:budgetId").get(
    authy,
    getBudget
);

// Update budget
router.route("/:budgetId").put(
    authy,
    validateRequest(budgetSchemas.update),
    updateBudget
);

// Delete budget (soft delete)
router.route("/:budgetId").delete(
    authy,
    deleteBudget
);

module.exports = router;


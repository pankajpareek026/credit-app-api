const {
    createIncome,
    getAllIncomes,
    getIncomesBySection,
    getIncome,
    updateIncome,
    deleteIncome,
    getIncomeStatistics
} = require('../controllers/income.controller');
const authy = require('../middlewares/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { incomeSchemas } = require('../utils/validationSchemas');

const Router = require('express').Router;
const router = Router();

// Create new income
router.route("/").post(
    authy,
    validateRequest(incomeSchemas.create),
    createIncome
);

// Get all incomes with pagination and filtering
router.route("/").get(
    authy,
    validateRequest(incomeSchemas.getAll, 'query'),
    getAllIncomes
);

// Get income statistics
router.route("/statistics").get(
    authy,
    validateRequest(incomeSchemas.getStatistics, 'query'),
    getIncomeStatistics
);

// Get incomes by budget section
router.route("/section/:sectionId").get(
    authy,
    getIncomesBySection
);

// Get single income
router.route("/:incomeId").get(
    authy,
    getIncome
);

// Update income
router.route("/:incomeId").put(
    authy,
    validateRequest(incomeSchemas.update),
    updateIncome
);

// Delete income
router.route("/:incomeId").delete(
    authy,
    deleteIncome
);

module.exports = router;


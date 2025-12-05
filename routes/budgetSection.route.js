const {
    createBudgetSection,
    getAllBudgetSections,
    getBudgetSection,
    updateBudgetSection,
    deleteBudgetSection,
    getBudgetSectionStatistics
} = require('../controllers/budgetSection.controller');
const authy = require('../middlewares/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { budgetSectionSchemas } = require('../utils/validationSchemas');

const Router = require('express').Router;
const router = Router();

// Create new budget section
router.route("/").post(
    authy,
    validateRequest(budgetSectionSchemas.create),
    createBudgetSection
);

// Get all budget sections with pagination and filtering
router.route("/").get(
    authy,
    validateRequest(budgetSectionSchemas.getAll, 'query'),
    getAllBudgetSections
);

// Get budget section statistics
router.route("/:sectionId/statistics").get(
    authy,
    getBudgetSectionStatistics
);

// Get single budget section
router.route("/:sectionId").get(
    authy,
    getBudgetSection
);

// Update budget section
router.route("/:sectionId").put(
    authy,
    validateRequest(budgetSectionSchemas.update),
    updateBudgetSection
);

// Delete budget section
router.route("/:sectionId").delete(
    authy,
    deleteBudgetSection
);

module.exports = router;


const {
  createGoal,
  getAllGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  markGoalAsCompleted,
  updateGoalProgress,
  getGoalStatistics
} = require('../controllers/goal.controller');
const authy = require('../middlewares/auth.middleware');

const Router = require('express').Router;
const router = Router();

// Create new goal
router.route("/create").post(authy, createGoal);

// Get all goals with pagination and filtering
router.route("/all").get(authy, getAllGoals);

// Get single goal
router.route("/:goalId").get(authy, getGoal);

// Update goal
router.route("/:goalId").put(authy, updateGoal);

// Delete goal
router.route("/:goalId").delete(authy, deleteGoal);

// Mark goal as completed
router.route("/:goalId/complete").patch(authy, markGoalAsCompleted);

// Update goal progress
router.route("/:goalId/progress").patch(authy, updateGoalProgress);

// Get goal statistics
router.route("/statistics").get(authy, getGoalStatistics);

module.exports = router;

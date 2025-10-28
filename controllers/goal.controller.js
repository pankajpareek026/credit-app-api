const Goal = require('../Models/goal.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');
const mongoose = require('mongoose');

// Create new goal
const createGoal = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const goalData = req.body;

    // Validation
    const messages = [];
    !goalData.title && messages.push("Title is required");
    !goalData.type && messages.push("Type is required");
    !goalData.frequency && messages.push("Frequency is required");
    !goalData.startDate && messages.push("Start date is required");
    !goalData.targetDate && messages.push("Target date is required");
    !goalData.targetValue && messages.push("Target value is required");
    !goalData.targetUnit && messages.push("Target unit is required");

    if (messages.length > 0) {
      return next(ApiError.validationError(messages.map(msg => ({
        field: 'goalData',
        message: msg,
        value: goalData
      }))));
    }

    // Create goal
    const goal = await Goal.create({
      parentId,
      title: goalData.title.trim(),
      description: goalData.description?.trim(),
      type: goalData.type,
      status: goalData.status || 'active',
      frequency: goalData.frequency,
      priority: goalData.priority || 'medium',
      startDate: new Date(goalData.startDate),
      targetDate: new Date(goalData.targetDate),
      targetValue: goalData.targetValue,
      targetUnit: goalData.targetUnit.trim(),
      currentValue: goalData.currentValue || 0,
      progressPercentage: goalData.progressPercentage || 0,
      isPublic: goalData.isPublic || false,
      createdBy: goalData.createdBy || 'Current User',
      tags: goalData.tags || [],
      reward: goalData.reward?.trim(),
      consequence: goalData.consequence?.trim(),
      streakDays: goalData.streakDays || 0,
      longestStreak: goalData.longestStreak || 0,
      hasReminders: goalData.hasReminders || false,
      reminderDates: goalData.reminderDates || [],
      activities: goalData.activities || [],
      milestones: goalData.milestones || [],
      isActive: goalData.isActive !== undefined ? goalData.isActive : true
    });

    return res.status(201).json(
      ApiResponse.success(goal, 'Goal created successfully')
    );
  } catch (error) {
    console.error("Create goal error:", error);
    return next(ApiError.internalError('Failed to create goal'));
  }
};

// Get all goals with pagination and filtering
const getAllGoals = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const {
      page = 1,
      limit = 20,
      status,
      type,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { parentId };

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get goals with pagination
    const goals = await Goal.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalGoals = await Goal.countDocuments(filter);

    const responseData = {
      goals,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalGoals / parseInt(limit)),
        totalGoals,
        hasNextPage: skip + goals.length < totalGoals,
        hasPrevPage: parseInt(page) > 1
      }
    };

    return res.status(200).json(
      ApiResponse.success(responseData, 'Goals retrieved successfully')
    );
  } catch (error) {
    console.error("Get all goals error:", error);
    return next(ApiError.internalError('Failed to retrieve goals'));
  }
};

// Get single goal by ID
const getGoal = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const { goalId } = req.params;

    if (!goalId) {
      return next(ApiError.validationError([{
        field: 'goalId',
        message: 'Goal ID is required',
        value: goalId
      }]));
    }

    const goal = await Goal.findOne({
      _id: goalId,
      parentId
    });

    if (!goal) {
      return next(ApiError.notFoundError('Goal not found'));
    }

    return res.status(200).json(
      ApiResponse.success(goal, 'Goal retrieved successfully')
    );
  } catch (error) {
    console.error("Get goal error:", error);
    return next(ApiError.internalError('Failed to retrieve goal'));
  }
};

// Update goal
const updateGoal = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const { goalId } = req.params;
    const updateData = req.body;

    if (!goalId) {
      return next(ApiError.validationError([{
        field: 'goalId',
        message: 'Goal ID is required',
        value: goalId
      }]));
    }

    const goal = await Goal.findOne({
      _id: goalId,
      parentId
    });

    if (!goal) {
      return next(ApiError.notFoundError('Goal not found'));
    }

    // Update goal
    const updatedGoal = await Goal.findByIdAndUpdate(
      goalId,
      {
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    );

    return res.status(200).json(
      ApiResponse.success(updatedGoal, 'Goal updated successfully')
    );
  } catch (error) {
    console.error("Update goal error:", error);
    return next(ApiError.internalError('Failed to update goal'));
  }
};

// Delete goal
const deleteGoal = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const { goalId } = req.params;

    if (!goalId) {
      return next(ApiError.validationError([{
        field: 'goalId',
        message: 'Goal ID is required',
        value: goalId
      }]));
    }

    const goal = await Goal.findOne({
      _id: goalId,
      parentId
    });

    if (!goal) {
      return next(ApiError.notFoundError('Goal not found'));
    }

    await Goal.findByIdAndDelete(goalId);

    return res.status(200).json(
      ApiResponse.success(null, 'Goal deleted successfully')
    );
  } catch (error) {
    console.error("Delete goal error:", error);
    return next(ApiError.internalError('Failed to delete goal'));
  }
};

// Mark goal as completed
const markGoalAsCompleted = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const { goalId } = req.params;

    if (!goalId) {
      return next(ApiError.validationError([{
        field: 'goalId',
        message: 'Goal ID is required',
        value: goalId
      }]));
    }

    const goal = await Goal.findOne({
      _id: goalId,
      parentId
    });

    if (!goal) {
      return next(ApiError.notFoundError('Goal not found'));
    }

    const updatedGoal = await Goal.findByIdAndUpdate(
      goalId,
      {
        status: 'completed',
        completedDate: new Date(),
        progressPercentage: 100,
        updatedAt: new Date()
      },
      { new: true }
    );

    return res.status(200).json(
      ApiResponse.success(updatedGoal, 'Goal marked as completed successfully')
    );
  } catch (error) {
    console.error("Mark goal as completed error:", error);
    return next(ApiError.internalError('Failed to mark goal as completed'));
  }
};

// Update goal progress
const updateGoalProgress = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const { goalId } = req.params;
    const { newValue, notes } = req.body;

    if (!goalId) {
      return next(ApiError.validationError([{
        field: 'goalId',
        message: 'Goal ID is required',
        value: goalId
      }]));
    }

    if (newValue === undefined) {
      return next(ApiError.validationError([{
        field: 'newValue',
        message: 'New value is required',
        value: newValue
      }]));
    }

    const goal = await Goal.findOne({
      _id: goalId,
      parentId
    });

    if (!goal) {
      return next(ApiError.notFoundError('Goal not found'));
    }

    // Calculate new progress percentage
    const newProgressPercentage = Math.min((newValue / goal.targetValue) * 100, 100);

    // Create new activity
    const activity = {
      id: new mongoose.Types.ObjectId().toString(),
      title: 'Progress Update',
      description: 'Updated progress to $newValue ${goal.targetUnit}',
      date: new Date(),
      isCompleted: true,
      value: newValue,
      notes: notes
    };

    // Update goal
    const updatedGoal = await Goal.findByIdAndUpdate(
      goalId,
      {
        currentValue: newValue,
        progressPercentage: newProgressPercentage,
        $push: { activities: activity },
        updatedAt: new Date()
      },
      { new: true }
    );

    return res.status(200).json(
      ApiResponse.success(updatedGoal, 'Goal progress updated successfully')
    );
  } catch (error) {
    console.error("Update goal progress error:", error);
    return next(ApiError.internalError('Failed to update goal progress'));
  }
};

// Get goal statistics
const getGoalStatistics = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;

    const stats = await Goal.aggregate([
      { $match: { parentId: new mongoose.Types.ObjectId(parentId) } },
      {
        $group: {
          _id: null,
          totalGoals: { $sum: 1 },
          activeGoals: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completedGoals: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          pausedGoals: { $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] } },
          cancelledGoals: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          averageProgress: { $avg: '$progressPercentage' },
          totalStreakDays: { $sum: '$streakDays' },
          totalLongestStreak: { $sum: '$longestStreak' }
        }
      }
    ]);

    const typeStats = await Goal.aggregate([
      { $match: { parentId: new mongoose.Types.ObjectId(parentId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const priorityStats = await Goal.aggregate([
      { $match: { parentId: new mongoose.Types.ObjectId(parentId) } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const responseData = {
      ...stats[0],
      typeStats,
      priorityStats,
      completionRate: stats[0]?.totalGoals > 0 
        ? (stats[0].completedGoals / stats[0].totalGoals) * 100 
        : 0
    };

    return res.status(200).json(
      ApiResponse.success(responseData, 'Goal statistics retrieved successfully')
    );
  } catch (error) {
    console.error("Get goal statistics error:", error);
    return next(ApiError.internalError('Failed to retrieve goal statistics'));
  }
};

module.exports = {
  createGoal,
  getAllGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  markGoalAsCompleted,
  updateGoalProgress,
  getGoalStatistics
};

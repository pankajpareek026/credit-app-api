const Routine = require('../Models/routine.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');
const mongoose = require('mongoose');

// Create new routine
const createRoutine = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const routineData = req.body;

    // Validation
    const messages = [];
    !routineData.name && messages.push("Name is required");
    !routineData.type && messages.push("Type is required");
    !routineData.startDate && messages.push("Start date is required");
    !routineData.endDate && messages.push("End date is required");
    !routineData.durationInDays && messages.push("Duration in days is required");

    if (messages.length > 0) {
      return next(ApiError.validationError(messages.map(msg => ({
        field: 'routineData',
        message: msg,
        value: routineData
      }))));
    }

    // Create routine
    const routine = await Routine.create({
      parentId,
      name: routineData.name.trim(),
      description: routineData.description?.trim(),
      type: routineData.type,
      color: routineData.color || '#3B82F6',
      startDate: new Date(routineData.startDate),
      endDate: new Date(routineData.endDate),
      durationInDays: routineData.durationInDays,
      steps: routineData.steps || [],
      isActive: routineData.isActive !== undefined ? routineData.isActive : true,
      isPublic: routineData.isPublic || false,
      tags: routineData.tags || [],
      reminderTime: routineData.reminderTime,
      reminderDays: routineData.reminderDays || [],
      statistics: {
        totalDays: routineData.durationInDays,
        completedDays: 0,
        currentStreak: 0,
        longestStreak: 0,
        averageCompletionRate: 0
      }
    });

    return res.status(201).json(
      ApiResponse.success(routine, 'Routine created successfully')
    );
  } catch (error) {
    console.error("Create routine error:", error);
    return next(ApiError.internalError('Failed to create routine'));
  }
};

// Get all routines with pagination and filtering
const getAllRoutines = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const {
      page = 1,
      limit = 20,
      type,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { parentId };

    if (type) filter.type = type;
    if (status) {
      switch (status) {
        case 'active':
          filter.isActive = true;
          filter.startDate = { $lte: new Date() };
          filter.endDate = { $gte: new Date() };
          break;
        case 'completed':
          filter.endDate = { $lt: new Date() };
          break;
        case 'upcoming':
          filter.startDate = { $gt: new Date() };
          break;
        case 'inactive':
          filter.isActive = false;
          break;
      }
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get routines with pagination
    const routines = await Routine.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalRoutines = await Routine.countDocuments(filter);

    const responseData = {
      routines,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRoutines / parseInt(limit)),
        totalRoutines,
        hasNextPage: skip + routines.length < totalRoutines,
        hasPrevPage: parseInt(page) > 1
      }
    };

    return res.status(200).json(
      ApiResponse.success(responseData, 'Routines retrieved successfully')
    );
  } catch (error) {
    console.error("Get all routines error:", error);
    return next(ApiError.internalError('Failed to retrieve routines'));
  }
};

// Get single routine by ID
const getRoutine = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const { routineId } = req.params;

    if (!routineId) {
      return next(ApiError.validationError([{
        field: 'routineId',
        message: 'Routine ID is required',
        value: routineId
      }]));
    }

    const routine = await Routine.findOne({
      _id: routineId,
      parentId
    });

    if (!routine) {
      return next(ApiError.notFoundError('Routine not found'));
    }

    return res.status(200).json(
      ApiResponse.success(routine, 'Routine retrieved successfully')
    );
  } catch (error) {
    console.error("Get routine error:", error);
    return next(ApiError.internalError('Failed to retrieve routine'));
  }
};

// Update routine
const updateRoutine = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const { routineId } = req.params;
    const updateData = req.body;

    if (!routineId) {
      return next(ApiError.validationError([{
        field: 'routineId',
        message: 'Routine ID is required',
        value: routineId
      }]));
    }

    const routine = await Routine.findOne({
      _id: routineId,
      parentId
    });

    if (!routine) {
      return next(ApiError.notFoundError('Routine not found'));
    }

    // Update routine
    const updatedRoutine = await Routine.findByIdAndUpdate(
      routineId,
      {
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    );

    return res.status(200).json(
      ApiResponse.success(updatedRoutine, 'Routine updated successfully')
    );
  } catch (error) {
    console.error("Update routine error:", error);
    return next(ApiError.internalError('Failed to update routine'));
  }
};

// Delete routine
const deleteRoutine = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const { routineId } = req.params;

    if (!routineId) {
      return next(ApiError.validationError([{
        field: 'routineId',
        message: 'Routine ID is required',
        value: routineId
      }]));
    }

    const routine = await Routine.findOne({
      _id: routineId,
      parentId
    });

    if (!routine) {
      return next(ApiError.notFoundError('Routine not found'));
    }

    await Routine.findByIdAndDelete(routineId);

    return res.status(200).json(
      ApiResponse.success(null, 'Routine deleted successfully')
    );
  } catch (error) {
    console.error("Delete routine error:", error);
    return next(ApiError.internalError('Failed to delete routine'));
  }
};

// Update routine progress
const updateRoutineProgress = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const { routineId } = req.params;
    const { date, stepCompletions, notes, mood, energyLevel } = req.body;

    if (!routineId) {
      return next(ApiError.validationError([{
        field: 'routineId',
        message: 'Routine ID is required',
        value: routineId
      }]));
    }

    if (!date) {
      return next(ApiError.validationError([{
        field: 'date',
        message: 'Date is required',
        value: date
      }]));
    }

    const routine = await Routine.findOne({
      _id: routineId,
      parentId
    });

    if (!routine) {
      return next(ApiError.notFoundError('Routine not found'));
    }

    const progressDate = new Date(date);
    const existingProgressIndex = routine.progress.findIndex(
      p => p.date.toDateString() === progressDate.toDateString()
    );

    const progressData = {
      routineId,
      date: progressDate,
      stepCompletions: stepCompletions || {},
      notes: notes || '',
      mood: mood || 'okay',
      energyLevel: energyLevel || 5,
      startedAt: new Date(),
      completedAt: stepCompletions && Object.values(stepCompletions).every(Boolean) 
        ? new Date() 
        : null
    };

    if (existingProgressIndex >= 0) {
      routine.progress[existingProgressIndex] = progressData;
    } else {
      routine.progress.push(progressData);
    }

    // Update statistics
    const completedDays = routine.progress.filter(p => p.completedAt).length;
    routine.statistics.completedDays = completedDays;
    routine.statistics.averageCompletionRate = 
      routine.statistics.totalDays > 0 
        ? (completedDays / routine.statistics.totalDays) * 100 
        : 0;

    await routine.save();

    return res.status(200).json(
      ApiResponse.success(routine, 'Routine progress updated successfully')
    );
  } catch (error) {
    console.error("Update routine progress error:", error);
    return next(ApiError.internalError('Failed to update routine progress'));
  }
};

// Get routine progress for a specific date range
const getRoutineProgress = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;
    const { routineId } = req.params;
    const { startDate, endDate } = req.query;

    if (!routineId) {
      return next(ApiError.validationError([{
        field: 'routineId',
        message: 'Routine ID is required',
        value: routineId
      }]));
    }

    const routine = await Routine.findOne({
      _id: routineId,
      parentId
    });

    if (!routine) {
      return next(ApiError.notFoundError('Routine not found'));
    }

    let progress = routine.progress;

    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      progress = progress.filter(p => p.date >= start && p.date <= end);
    }

    return res.status(200).json(
      ApiResponse.success(progress, 'Routine progress retrieved successfully')
    );
  } catch (error) {
    console.error("Get routine progress error:", error);
    return next(ApiError.internalError('Failed to retrieve routine progress'));
  }
};

// Get routine statistics
const getRoutineStatistics = async (req, res, next) => {
  try {
    const parentId = req.body.user._id;

    const stats = await Routine.aggregate([
      { $match: { parentId: new mongoose.Types.ObjectId(parentId) } },
      {
        $group: {
          _id: null,
          totalRoutines: { $sum: 1 },
          activeRoutines: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $eq: ['$isActive', true] },
                    { $lte: ['$startDate', new Date()] },
                    { $gte: ['$endDate', new Date()] }
                  ]
                }, 
                1, 
                0
              ] 
            } 
          },
          completedRoutines: { 
            $sum: { 
              $cond: [{ $lt: ['$endDate', new Date()] }, 1, 0] 
            } 
          },
          totalDays: { $sum: '$statistics.totalDays' },
          completedDays: { $sum: '$statistics.completedDays' },
          averageCompletionRate: { $avg: '$statistics.averageCompletionRate' },
          totalStreak: { $sum: '$statistics.currentStreak' },
          longestStreak: { $max: '$statistics.longestStreak' }
        }
      }
    ]);

    const typeStats = await Routine.aggregate([
      { $match: { parentId: new mongoose.Types.ObjectId(parentId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const responseData = {
      ...stats[0],
      typeStats,
      overallCompletionRate: stats[0]?.totalDays > 0 
        ? (stats[0].completedDays / stats[0].totalDays) * 100 
        : 0
    };

    return res.status(200).json(
      ApiResponse.success(responseData, 'Routine statistics retrieved successfully')
    );
  } catch (error) {
    console.error("Get routine statistics error:", error);
    return next(ApiError.internalError('Failed to retrieve routine statistics'));
  }
};

module.exports = {
  createRoutine,
  getAllRoutines,
  getRoutine,
  updateRoutine,
  deleteRoutine,
  updateRoutineProgress,
  getRoutineProgress,
  getRoutineStatistics
};

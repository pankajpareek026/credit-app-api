const express = require('express');
const router = express.Router();
const {
    createRoutine,
    getAllRoutines,
    getRoutine,
    updateRoutine,
    deleteRoutine,
    updateRoutineProgress,
    getRoutineProgress,
    getRoutineStatistics
} = require('../controllers/routine.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Create new routine
router.post('/create', authMiddleware, createRoutine);

// Get all routines with pagination and filtering
router.get('/all', authMiddleware, getAllRoutines);

// Get single routine
router.get('/:routineId', authMiddleware, getRoutine);

// Update routine
router.put('/:routineId', authMiddleware, updateRoutine);

// Delete routine
router.delete('/:routineId', authMiddleware, deleteRoutine);

// Update routine progress
router.patch('/:routineId/progress', authMiddleware, updateRoutineProgress);

// Get routine progress
router.get('/:routineId/progress', authMiddleware, getRoutineProgress);

// Get routine statistics
router.get('/statistics', authMiddleware, getRoutineStatistics);

module.exports = router;










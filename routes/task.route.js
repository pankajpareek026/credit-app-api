const {
    getTree,
    upsertTree,
    createMainList,
    renameMainList,
    deleteMainList,
    createSubList,
    renameSubList,
    deleteSubList,
    createTask,
    updateTask,
    deleteTask,
    addSubTask,
    updateSubTask,
    deleteSubTask,
} = require('../controllers/task.controller')
const authy = require('../middlewares/auth.middleware')
const Router = require('express').Router
const router = Router()

// Get or upsert entire tree
router.route('/tree').get(authy, getTree).put(authy, upsertTree)

// Main list
router.route('/lists').post(authy, createMainList)
router.route('/lists/:listId').put(authy, renameMainList).delete(authy, deleteMainList)

// Sub-lists
router.route('/lists/:listId/sublists').post(authy, createSubList)
router.route('/lists/:listId/sublists/:subListId').put(authy, renameSubList).delete(authy, deleteSubList)

// Tasks
router.route('/lists/:listId/sublists/:subListId/tasks').post(authy, createTask)
router.route('/lists/:listId/sublists/:subListId/tasks/:taskId').put(authy, updateTask).delete(authy, deleteTask)

// Subtasks
router.route('/lists/:listId/sublists/:subListId/tasks/:taskId/subtasks').post(authy, addSubTask)
router.route('/lists/:listId/sublists/:subListId/tasks/:taskId/subtasks/:subTaskId').put(authy, updateSubTask).delete(authy, deleteSubTask)

module.exports = router



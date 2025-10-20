const TaskTree = require('../Models/taskTree.modal')
const ApiResponse = require('../utils/apiResponse.utils')
const { tasksSchemas } = require('../utils/validationSchemas')

// Helper: get or create user's task tree
async function getOrCreateTree(userId) {
    let tree = await TaskTree.findOne({ userId })
    if (!tree) {
        tree = await TaskTree.create({ userId, mainLists: [] })
    }
    return tree
}

exports.getTree = async (req, res, next) => {
    try {
        const userId = req.body.user.id
        const tree = await getOrCreateTree(userId)
        return res.json(ApiResponse.success(tree))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to get tasks tree'))
    }
}

exports.upsertTree = async (req, res, next) => {
    try {
        const { error, value } = tasksSchemas.upsertTree.validate(req.body, { abortEarly: false })
        if (error) return res.status(400).json(ApiResponse.error(error.message))
        const userId = req.body.user.id
        const tree = await TaskTree.findOneAndUpdate(
            { userId },
            { mainLists: value.mainLists || [] },
            { upsert: true, new: true }
        )
        return res.json(ApiResponse.updated(tree, 'Tasks tree updated'))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to update tasks tree'))
    }
}

exports.createMainList = async (req, res) => {
    try {
        const { error, value } = tasksSchemas.createMainList.validate(req.body)
        if (error) return res.status(400).json(ApiResponse.error(error.message))
        const userId = req.body.user.id
        const tree = await getOrCreateTree(userId)
        const listId = (new Date().getTime()).toString(36)
        tree.mainLists.push({ listId, name: value.name, subLists: [] })
        await tree.save()
        return res.status(201).json(ApiResponse.created({ listId, name: value.name }))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to create list'))
    }
}

exports.renameMainList = async (req, res) => {
    try {
        const { listId } = req.params
        const { name } = req.body
        if (!name) return res.status(400).json(ApiResponse.error('Name is required'))
        const userId = req.body.user.id
        const tree = await getOrCreateTree(userId)
        const list = tree.mainLists.find(l => l.listId === listId)
        if (!list) return res.status(404).json(ApiResponse.error('List not found'))
        list.name = name
        await tree.save()
        return res.json(ApiResponse.updated({ listId, name }))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to rename list'))
    }
}

exports.deleteMainList = async (req, res) => {
    try {
        const { listId } = req.params
        const userId = req.body.user.id
        const tree = await getOrCreateTree(userId)
        const before = tree.mainLists.length
        tree.mainLists = tree.mainLists.filter(l => l.listId !== listId)
        if (tree.mainLists.length === before) return res.status(404).json(ApiResponse.error('List not found'))
        await tree.save()
        return res.json(ApiResponse.deleted('List deleted'))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to delete list'))
    }
}

exports.createSubList = async (req, res) => {
    try {
        const { error, value } = tasksSchemas.createSubList.validate(req.body)
        if (error) return res.status(400).json(ApiResponse.error(error.message))
        const { listId } = req.params
        const userId = req.body.user.id
        const tree = await getOrCreateTree(userId)
        const list = tree.mainLists.find(l => l.listId === listId)
        if (!list) return res.status(404).json(ApiResponse.error('List not found'))
        const subListId = (new Date().getTime()).toString(36)
        list.subLists.push({ subListId, name: value.name, tasks: [] })
        await tree.save()
        return res.status(201).json(ApiResponse.created({ subListId, name: value.name }))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to create sub-list'))
    }
}

exports.renameSubList = async (req, res) => {
    try {
        const { listId, subListId } = req.params
        const { name } = req.body
        if (!name) return res.status(400).json(ApiResponse.error('Name is required'))
        const userId = req.body.user.id
        const tree = await getOrCreateTree(userId)
        const list = tree.mainLists.find(l => l.listId === listId)
        if (!list) return res.status(404).json(ApiResponse.error('List not found'))
        const sub = list.subLists.find(s => s.subListId === subListId)
        if (!sub) return res.status(404).json(ApiResponse.error('Sub-list not found'))
        sub.name = name
        await tree.save()
        return res.json(ApiResponse.updated({ subListId, name }))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to rename sub-list'))
    }
}

exports.deleteSubList = async (req, res) => {
    try {
        const { listId, subListId } = req.params
        const userId = req.body.user.id
        const tree = await getOrCreateTree(userId)
        const list = tree.mainLists.find(l => l.listId === listId)
        if (!list) return res.status(404).json(ApiResponse.error('List not found'))
        const before = list.subLists.length
        list.subLists = list.subLists.filter(s => s.subListId !== subListId)
        if (before === list.subLists.length) return res.status(404).json(ApiResponse.error('Sub-list not found'))
        await tree.save()
        return res.json(ApiResponse.deleted('Sub-list deleted'))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to delete sub-list'))
    }
}

exports.createTask = async (req, res) => {
    try {
        const { error, value } = tasksSchemas.createTask.validate(req.body)
        if (error) return res.status(400).json(ApiResponse.error(error.message))
        const { listId, subListId } = req.params
        const userId = req.body.user.id
        const tree = await getOrCreateTree(userId)
        const list = tree.mainLists.find(l => l.listId === listId)
        if (!list) return res.status(404).json(ApiResponse.error('List not found'))
        const sub = list.subLists.find(s => s.subListId === subListId)
        if (!sub) return res.status(404).json(ApiResponse.error('Sub-list not found'))
        const taskId = (new Date().getTime()).toString(36)
        const task = { taskId, ...value }
        sub.tasks.push(task)
        await tree.save()
        return res.status(201).json(ApiResponse.created(task))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to create task'))
    }
}

exports.updateTask = async (req, res) => {
    try {
        const { error, value } = tasksSchemas.updateTask.validate(req.body)
        if (error) return res.status(400).json(ApiResponse.error(error.message))
        const { listId, subListId, taskId } = req.params
        const userId = req.body.user.id
        const tree = await getOrCreateTree(userId)
        const list = tree.mainLists.find(l => l.listId === listId)
        if (!list) return res.status(404).json(ApiResponse.error('List not found'))
        const sub = list.subLists.find(s => s.subListId === subListId)
        if (!sub) return res.status(404).json(ApiResponse.error('Sub-list not found'))
        const task = sub.tasks.find(t => t.taskId === taskId)
        if (!task) return res.status(404).json(ApiResponse.error('Task not found'))
        Object.assign(task, value)
        await tree.save()
        return res.json(ApiResponse.updated(task))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to update task'))
    }
}

exports.deleteTask = async (req, res) => {
    try {
        const { listId, subListId, taskId } = req.params
        const userId = req.body.user.id
        const tree = await getOrCreateTree(userId)
        const list = tree.mainLists.find(l => l.listId === listId)
        if (!list) return res.status(404).json(ApiResponse.error('List not found'))
        const sub = list.subLists.find(s => s.subListId === subListId)
        if (!sub) return res.status(404).json(ApiResponse.error('Sub-list not found'))
        const before = sub.tasks.length
        sub.tasks = sub.tasks.filter(t => t.taskId !== taskId)
        if (before === sub.tasks.length) return res.status(404).json(ApiResponse.error('Task not found'))
        await tree.save()
        return res.json(ApiResponse.deleted('Task deleted'))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to delete task'))
    }
}

exports.addSubTask = async (req, res) => {
    try {
        const { title, status, dueDate } = req.body
        if (!title) return res.status(400).json(ApiResponse.error('Title is required'))
        const { listId, subListId, taskId } = req.params
        const userId = req.body.user.id
        const tree = await getOrCreateTree(userId)
        const list = tree.mainLists.find(l => l.listId === listId)
        if (!list) return res.status(404).json(ApiResponse.error('List not found'))
        const sub = list.subLists.find(s => s.subListId === subListId)
        if (!sub) return res.status(404).json(ApiResponse.error('Sub-list not found'))
        const task = sub.tasks.find(t => t.taskId === taskId)
        if (!task) return res.status(404).json(ApiResponse.error('Task not found'))
        const subTaskId = (new Date().getTime()).toString(36)
        const subTask = { subTaskId, title, status: status || 'Pending', dueDate: dueDate || null }
        task.subtasks.push(subTask)
        await tree.save()
        return res.status(201).json(ApiResponse.created(subTask))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to add subtask'))
    }
}

exports.updateSubTask = async (req, res) => {
    try {
        const { listId, subListId, taskId, subTaskId } = req.params
        const userId = req.body.user.id
        const { title, status, dueDate } = req.body
        const tree = await getOrCreateTree(userId)
        const list = tree.mainLists.find(l => l.listId === listId)
        if (!list) return res.status(404).json(ApiResponse.error('List not found'))
        const sub = list.subLists.find(s => s.subListId === subListId)
        if (!sub) return res.status(404).json(ApiResponse.error('Sub-list not found'))
        const task = sub.tasks.find(t => t.taskId === taskId)
        if (!task) return res.status(404).json(ApiResponse.error('Task not found'))
        const s = task.subtasks.find(st => st.subTaskId === subTaskId)
        if (!s) return res.status(404).json(ApiResponse.error('Subtask not found'))
        if (title !== undefined) s.title = title
        if (status !== undefined) s.status = status
        if (dueDate !== undefined) s.dueDate = dueDate
        await tree.save()
        return res.json(ApiResponse.updated(s))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to update subtask'))
    }
}

exports.deleteSubTask = async (req, res) => {
    try {
        const { listId, subListId, taskId, subTaskId } = req.params
        const userId = req.body.user.id
        const tree = await getOrCreateTree(userId)
        const list = tree.mainLists.find(l => l.listId === listId)
        if (!list) return res.status(404).json(ApiResponse.error('List not found'))
        const sub = list.subLists.find(s => s.subListId === subListId)
        if (!sub) return res.status(404).json(ApiResponse.error('Sub-list not found'))
        const task = sub.tasks.find(t => t.taskId === taskId)
        if (!task) return res.status(404).json(ApiResponse.error('Task not found'))
        const before = task.subtasks.length
        task.subtasks = task.subtasks.filter(st => st.subTaskId !== subTaskId)
        if (before === task.subtasks.length) return res.status(404).json(ApiResponse.error('Subtask not found'))
        await tree.save()
        return res.json(ApiResponse.deleted('Subtask deleted'))
    } catch (e) {
        return res.status(500).json(ApiResponse.error('Failed to delete subtask'))
    }
}



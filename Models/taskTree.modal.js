const mongoose = require('mongoose')

const SubTaskSchema = new mongoose.Schema({
    subTaskId: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() },
    title: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Completed', 'In Progress'], default: 'Pending' },
    dueDate: { type: Date, default: null },
}, { _id: false, timestamps: false })

const TaskSchema = new mongoose.Schema({
    taskId: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() },
    title: { type: String, required: true },
    status: { type: String, enum: ['Applied', 'Pending', 'Completed', 'In Progress'], default: 'Pending' },
    jobUrl: { type: String, default: null },
    dueDate: { type: Date, default: null },
    notes: { type: String, default: null },
    amount: { type: Number, default: null },
    subtasks: { type: [SubTaskSchema], default: [] },
}, { _id: false, timestamps: false })

const SubListSchema = new mongoose.Schema({
    subListId: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() },
    name: { type: String, required: true },
    tasks: { type: [TaskSchema], default: [] },
}, { _id: false, timestamps: false })

const MainListSchema = new mongoose.Schema({
    listId: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() },
    name: { type: String, required: true },
    subLists: { type: [SubListSchema], default: [] },
}, { _id: false, timestamps: false })

const TaskTreeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true, unique: true },
    mainLists: { type: [MainListSchema], default: [] },
}, { timestamps: true })

module.exports = mongoose.model('task_tree', TaskTreeSchema)



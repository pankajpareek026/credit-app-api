const mongoose = require('mongoose');

const billReminderSchema = new mongoose.Schema({
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    title: {
        type: String,
        required: [true, "Bill title is required"],
        maxLength: [50, "Title must not exceed 50 characters"]
    },
    amount: {
        type: Number,
        required: [true, "Amount is required"],
        min: [0, "Amount must be positive"]
    },
    dueDate: {
        type: Date,
        required: [true, "Due date is required"]
    },
    provider: {
        type: String,
        required: [true, "Provider is required"],
        maxLength: [30, "Provider name must not exceed 30 characters"]
    },
    category: {
        type: String,
        enum: ['UTILITIES', 'RENT', 'INSURANCE', 'SUBSCRIPTION', 'LOAN', 'CREDIT_CARD', 'OTHER'],
        default: 'OTHER'
    },
    status: {
        type: String,
        enum: ['PENDING', 'PAID', 'OVERDUE', 'SNOOZED'],
        default: 'PENDING'
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringInterval: {
        type: String,
        enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'],
        default: 'MONTHLY'
    },
    notes: {
        type: String,
        maxLength: [200, "Notes must not exceed 200 characters"]
    },
    reminderDate: {
        type: Date,
        required: [true, "Reminder date is required"]
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
billReminderSchema.index({ parentId: 1, dueDate: 1 });
billReminderSchema.index({ parentId: 1, status: 1 });
billReminderSchema.index({ dueDate: 1, status: 1 });

// Virtual for checking if bill is overdue
billReminderSchema.virtual('isOverdue').get(function() {
    return this.dueDate < new Date() && this.status === 'PENDING';
});

// Pre-save middleware to set status based on due date
billReminderSchema.pre('save', function(next) {
    if (this.dueDate < new Date() && this.status === 'PENDING') {
        this.status = 'OVERDUE';
    }
    next();
});

module.exports = mongoose.model('BillReminder', billReminderSchema); 
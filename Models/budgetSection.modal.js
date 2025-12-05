const mongoose = require('mongoose');

const budgetSectionSchema = new mongoose.Schema({
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        required: true,
        index: true,
        validate: {
            validator: function(value) {
                return value > this.startDate;
            },
            message: 'End date must be after start date'
        }
    },
    targetBudget: {
        type: Number,
        min: 0,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true
});

// Indexes for better query performance
budgetSectionSchema.index({ parentId: 1, startDate: -1 });
budgetSectionSchema.index({ parentId: 1, endDate: -1 });
budgetSectionSchema.index({ parentId: 1, isActive: 1 });

// Virtual for total income (calculated from income entries)
budgetSectionSchema.virtual('totalIncome', {
    ref: 'Income',
    localField: '_id',
    foreignField: 'budgetSectionId',
    options: { match: { isActive: true } }
});

// Virtual for total expenses (calculated from expense entries)
budgetSectionSchema.virtual('totalExpenses', {
    ref: 'Expense',
    localField: '_id',
    foreignField: 'budgetSectionId',
    options: { match: { isActive: true } }
});

// Note: Virtual fields for totalIncome and totalExpenses will be calculated in controller
// using aggregation for better performance

// Ensure virtual fields are serialized
budgetSectionSchema.set('toJSON', { virtuals: true });
budgetSectionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BudgetSection', budgetSectionSchema);


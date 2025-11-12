const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
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
    allocatedAmount: {
        type: Number,
        required: true,
        min: 0.01
    },
    spentAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    category: {
        type: String,
        required: true,
        enum: ['FOOD', 'TRANSPORT', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'INVESTMENT', 'OTHER'],
        default: 'OTHER'
    },
    period: {
        type: String,
        required: true,
        enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'],
        default: 'MONTHLY'
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
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true
});

// Indexes for better query performance
budgetSchema.index({ parentId: 1, startDate: -1 });
budgetSchema.index({ parentId: 1, endDate: -1 });
budgetSchema.index({ parentId: 1, category: 1 });
budgetSchema.index({ parentId: 1, period: 1 });
budgetSchema.index({ parentId: 1, isActive: 1 });

// Virtual for remaining amount
budgetSchema.virtual('remainingAmount').get(function() {
    return Math.max(0, this.allocatedAmount - this.spentAmount);
});

// Virtual for percentage spent
budgetSchema.virtual('percentageSpent').get(function() {
    if (this.allocatedAmount === 0) return 0;
    return Math.min(100, (this.spentAmount / this.allocatedAmount) * 100);
});

// Ensure virtual fields are serialized
budgetSchema.set('toJSON', { virtuals: true });
budgetSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Budget', budgetSchema);


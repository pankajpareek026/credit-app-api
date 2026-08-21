const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    budgetSectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BudgetSection',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 500
    },
    sourceType: {
        type: String,
        required: true,
        enum: ['SALARY', 'GIFT', 'SAVINGS', 'LOAN', 'OTHER'],
        default: 'OTHER'
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'clients',
        index: true
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
incomeSchema.index({ parentId: 1, budgetSectionId: 1 });
incomeSchema.index({ parentId: 1, date: -1 });
incomeSchema.index({ parentId: 1, sourceType: 1 });
incomeSchema.index({ parentId: 1, isActive: 1 });
incomeSchema.index({ budgetSectionId: 1, isActive: 1 });
incomeSchema.index({ clientId: 1, isActive: 1 });

// Virtual for formatted amount
incomeSchema.virtual('formattedAmount').get(function() {
    return this.amount.toFixed(2);
});

// Ensure virtual fields are serialized
incomeSchema.set('toJSON', { virtuals: true });
incomeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Income', incomeSchema);


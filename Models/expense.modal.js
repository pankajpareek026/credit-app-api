const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
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
    category: {
        type: String,
        required: true,
        enum: ['FOOD', 'TRANSPORT', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'EDUCATION', 'INVESTMENT', 'OTHER'],
        default: 'OTHER'
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['CASH', 'CARD', 'UPI', 'BANK', 'WALLET', 'OTHER'],
        default: 'CASH'
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: 20
    }],
    notes: {
        type: String,
        trim: true,
        maxlength: 500
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
expenseSchema.index({ parentId: 1, date: -1 });
expenseSchema.index({ parentId: 1, category: 1 });
expenseSchema.index({ parentId: 1, paymentMethod: 1 });
expenseSchema.index({ parentId: 1, isActive: 1 });

// Virtual for formatted amount
expenseSchema.virtual('formattedAmount').get(function() {
    return this.amount.toFixed(2);
});

// Ensure virtual fields are serialized
expenseSchema.set('toJSON', { virtuals: true });
expenseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Expense', expenseSchema);

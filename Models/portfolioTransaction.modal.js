const mongoose = require('mongoose');

const portfolioTransactionSchema = new mongoose.Schema({
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    assetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PortfolioAsset',
        required: true,
        index: true
    },
    assetType: {
        type: String,
        required: true,
        enum: ['CRYPTO', 'STOCK', 'MUTUAL_FUND'],
        index: true
    },
    transactionType: {
        type: String,
        required: true,
        enum: ['BUY', 'SELL', 'TRANSFER'],
        index: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    fees: {
        type: Number,
        default: 0,
        min: 0
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    exchange: {
        type: String,
        trim: true,
        maxlength: 50
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Indexes for better query performance
portfolioTransactionSchema.index({ parentId: 1, assetId: 1 });
portfolioTransactionSchema.index({ parentId: 1, assetType: 1 });
portfolioTransactionSchema.index({ parentId: 1, transactionType: 1 });
portfolioTransactionSchema.index({ parentId: 1, date: -1 });
portfolioTransactionSchema.index({ assetId: 1, date: -1 });

// Virtual for formatted total amount
portfolioTransactionSchema.virtual('formattedTotalAmount').get(function() {
    return this.totalAmount.toFixed(2);
});

// Ensure virtual fields are serialized
portfolioTransactionSchema.set('toJSON', { virtuals: true });
portfolioTransactionSchema.set('toObject', { virtuals: true });

// Pre-save middleware to calculate totalAmount
portfolioTransactionSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('quantity') || this.isModified('price')) {
        this.totalAmount = this.quantity * this.price;
    }
    next();
});

module.exports = mongoose.model('PortfolioTransaction', portfolioTransactionSchema);


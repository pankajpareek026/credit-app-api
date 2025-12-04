const mongoose = require('mongoose');

const assetBreakdownSchema = new mongoose.Schema({
    assetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PortfolioAsset',
        required: true
    },
    assetType: {
        type: String,
        required: true,
        enum: ['CRYPTO', 'STOCK', 'MUTUAL_FUND']
    },
    symbol: {
        type: String,
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },
    percentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    }
}, { _id: false });

const portfolioSnapshotSchema = new mongoose.Schema({
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    snapshotDate: {
        type: Date,
        required: true,
        index: true
    },
    totalPortfolioValue: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    cryptoValue: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    stockValue: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    mutualFundValue: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    totalInvested: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    totalProfitLoss: {
        type: Number,
        default: 0
    },
    totalProfitLossPercentage: {
        type: Number,
        default: 0
    },
    assetBreakdown: {
        type: [assetBreakdownSchema],
        default: []
    }
}, {
    timestamps: true
});

// Indexes for better query performance
portfolioSnapshotSchema.index({ parentId: 1, snapshotDate: -1 });
portfolioSnapshotSchema.index({ parentId: 1, createdAt: -1 });

// Compound index for date range queries
portfolioSnapshotSchema.index({ parentId: 1, snapshotDate: 1 });

// Virtual for formatted total portfolio value
portfolioSnapshotSchema.virtual('formattedTotalPortfolioValue').get(function() {
    return this.totalPortfolioValue.toFixed(2);
});

// Ensure virtual fields are serialized
portfolioSnapshotSchema.set('toJSON', { virtuals: true });
portfolioSnapshotSchema.set('toObject', { virtuals: true });

// Pre-save middleware to calculate derived fields
portfolioSnapshotSchema.pre('save', function(next) {
    // Calculate total profit/loss
    this.totalProfitLoss = this.totalPortfolioValue - this.totalInvested;
    
    // Calculate profit/loss percentage
    if (this.totalInvested > 0) {
        this.totalProfitLossPercentage = ((this.totalProfitLoss / this.totalInvested) * 100);
    } else {
        this.totalProfitLossPercentage = 0;
    }
    
    next();
});

module.exports = mongoose.model('PortfolioSnapshot', portfolioSnapshotSchema);


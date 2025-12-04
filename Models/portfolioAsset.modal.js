const mongoose = require('mongoose');

const portfolioAssetSchema = new mongoose.Schema({
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    assetType: {
        type: String,
        required: true,
        enum: ['CRYPTO', 'STOCK', 'MUTUAL_FUND'],
        index: true
    },
    symbol: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    averageBuyPrice: {
        type: Number,
        required: true,
        min: 0
    },
    currentPrice: {
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
    currentValue: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    profitLoss: {
        type: Number,
        default: 0
    },
    profitLossPercentage: {
        type: Number,
        default: 0
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
portfolioAssetSchema.index({ parentId: 1, assetType: 1 });
portfolioAssetSchema.index({ parentId: 1, isActive: 1 });
portfolioAssetSchema.index({ parentId: 1, symbol: 1 });
portfolioAssetSchema.index({ parentId: 1, createdAt: -1 });

// Virtual for formatted current value
portfolioAssetSchema.virtual('formattedCurrentValue').get(function() {
    return this.currentValue.toFixed(2);
});

// Virtual for formatted profit loss
portfolioAssetSchema.virtual('formattedProfitLoss').get(function() {
    return this.profitLoss.toFixed(2);
});

// Ensure virtual fields are serialized
portfolioAssetSchema.set('toJSON', { virtuals: true });
portfolioAssetSchema.set('toObject', { virtuals: true });

// Pre-save middleware to calculate derived fields
portfolioAssetSchema.pre('save', function(next) {
    // Calculate current value
    this.currentValue = this.quantity * this.currentPrice;
    
    // Calculate profit/loss
    this.profitLoss = this.currentValue - this.totalInvested;
    
    // Calculate profit/loss percentage
    if (this.totalInvested > 0) {
        this.profitLossPercentage = ((this.profitLoss / this.totalInvested) * 100);
    } else {
        this.profitLossPercentage = 0;
    }
    
    next();
});

module.exports = mongoose.model('PortfolioAsset', portfolioAssetSchema);


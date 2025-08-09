const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema({
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    username: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    url: {
        type: String,
        trim: true,
        maxlength: 500
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    category: {
        type: String,
        default: 'general',
        trim: true,
        maxlength: 50
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
credentialSchema.index({ parentId: 1, title: 1 });
credentialSchema.index({ parentId: 1, category: 1 });
credentialSchema.index({ parentId: 1, isActive: 1 });

// Virtual for formatted creation date
credentialSchema.virtual('formattedCreatedAt').get(function () {
    return this.createdAt.toLocaleDateString();
});

// Virtual for formatted update date
credentialSchema.virtual('formattedUpdatedAt').get(function () {
    return this.updatedAt.toLocaleDateString();
});

// Ensure virtuals are serialized
credentialSchema.set('toJSON', { virtuals: true });
credentialSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Credential', credentialSchema); 
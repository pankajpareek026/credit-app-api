const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    title: {
        type: String,
        required: [true, "Note title is required"],
        maxLength: [100, "Title must not exceed 100 characters"]
    },
    content: {
        type: String,
        required: [true, "Note content is required"],
        maxLength: [10000, "Content must not exceed 10000 characters"]
    },
    password: {
        type: String,
        default: null
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    color: {
        type: String,
        enum: ['yellow', 'green', 'blue', 'pink', 'purple', 'orange', 'red', null],
        default: null
    },
    tags: [{
        type: String,
        maxLength: [20, "Tag must not exceed 20 characters"]
    }],
    isPinned: {
        type: Boolean,
        default: false
    },
    category: {
        type: String,
        maxLength: [50, "Category must not exceed 50 characters"]
    },
    wordCount: {
        type: Number,
        default: 0
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
noteSchema.index({ parentId: 1, createdAt: -1 });
noteSchema.index({ parentId: 1, isPinned: 1 });
noteSchema.index({ parentId: 1, isLocked: 1 });
noteSchema.index({ parentId: 1, isArchived: 1 });
noteSchema.index({ parentId: 1, category: 1 });
noteSchema.index({ parentId: 1, tags: 1 });

// Virtual for character count
noteSchema.virtual('characterCount').get(function() {
    return this.content.length;
});

// Pre-save middleware to calculate word count
noteSchema.pre('save', function(next) {
    if (this.content) {
        this.wordCount = this.content.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    next();
});

module.exports = mongoose.model('Note', noteSchema); 